"""Ranks preparedness recommendations for a shortage description.

Uses sentence-transformers (all-MiniLM-L6-v2) with cosine similarity.
If the model can't load, it falls back to TF-IDF, so the service keeps working.
"""

import json
import logging
import os
from pathlib import Path

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

CATALOG_PATH = Path(__file__).parent / "catalog.json"
MODEL_NAME = "all-MiniLM-L6-v2"

# Scores mean different things for each method, so each has its own thresholds.
# Set from the gap engine's real shortage sentences: retune if the catalog or sentences change.
# semantic: real top answers score 0.34 and up, unrelated sentences 0.29 at most.
# tfidf: the two overlap (some right answers score ~0.06, small talk can reach ~0.22),
# so a lower low_confidence would mark junk as confident. Expect more flags on the fallback.
THRESHOLDS = {
    "semantic": {"low_confidence": 0.32, "no_match": 0.15},
    "tfidf": {"low_confidence": 0.2, "no_match": 0.05},
}

# Gap engine resource -> catalog categories to rank within.
# Without this, scenario words like "tornado" outweigh the actual shortage.
RESOURCE_CATEGORIES = {
    "drinking_water": ["water"],
    "sanitation_water": ["water", "sanitation"],
    "food": ["food"],
    "first_aid": ["medical"],
    "medication": ["medical"],
    "lighting": ["lighting"],
    "radio": ["communication"],
    "power": ["power"],
    "shelter": ["shelter"],
    "sanitation": ["sanitation"],
    "infant_food": ["infant"],
    "pet_food": ["pets"],
}

# Scenario keys from backend/src/config/scenarios.js. Keep in sync when a scenario is added.
SCENARIOS = {"tornado", "winterStorm", "powerOutage", "flood"}

# Added to the score of items tagged for the request's scenario, and taken off items
# tagged only for other scenarios (or when no scenario is sent). Untagged (general)
# items are left alone.
# Only the ranking uses it: the confidence shown is still the raw similarity.
# Picked by sweeping 0 to 0.1 with eval/run_eval.py: higher values cut wrong-scenario
# advice further but start putting scenario items above the advice the shortage needs.
SCENARIO_BOOST = {"semantic": 0.05, "tfidf": 0.05}

GENERIC_ADVICE = {
    "id": "generic-kit",
    "category": "general",
    "title": "Review your basic emergency kit",
    "explanation": "Check that you have water, food, medication, a flashlight, a radio and first aid "
    "supplies for every person in your household. Ready.gov has a full checklist.",
}


def load_catalog(path=CATALOG_PATH):
    catalog = json.loads(Path(path).read_text())
    for item in catalog:
        missing = {"id", "category", "title", "explanation", "text"} - item.keys()
        if missing:
            raise ValueError(f"Catalog item {item.get('id')} is missing {sorted(missing)}");
        unknown = set(item.get("scenarios", [])) - SCENARIOS
        if unknown:
            raise ValueError(f"Catalog item {item['id']} has unknown scenarios {sorted(unknown)}")
    return catalog


class Ranker:
    def __init__(self, catalog=None, use_model=True):
        self.catalog = catalog if catalog is not None else load_catalog()
        texts = [item["text"] for item in self.catalog]

        # TF-IDF is always built, so it's ready as the fallback.
        self.tfidf = TfidfVectorizer(stop_words="english", ngram_range=(1, 2)).fit(texts)
        self.tfidf_catalog = self.tfidf.transform(texts)

        self.model = None
        self.method = "tfidf"

        if use_model and os.environ.get("AI_FORCE_FALLBACK") != "1":
            try:
                from sentence_transformers import SentenceTransformer

                self.model = SentenceTransformer(MODEL_NAME)
                self.catalog_embeddings = self.model.encode(texts, normalize_embeddings=True)
                self.method = "semantic"
            except Exception:
                logger.exception("Could not load %s; using the TF-IDF fallback", MODEL_NAME)
                self.model = None

    def _scores(self, query):
        if self.model is not None:
            query_embedding = self.model.encode([query], normalize_embeddings=True)
            # Embeddings are normalized, so the dot product is the cosine similarity.
            return (query_embedding @ self.catalog_embeddings.T)[0].tolist()
        return cosine_similarity(self.tfidf.transform([query]), self.tfidf_catalog)[0].tolist()

    def _scenario_adjustment(self, item, scenario):
        tags = item.get("scenarios")
        if not tags:
            return 0.0
        boost = SCENARIO_BOOST[self.method]
        # No (or an unknown) scenario: we can't tell which disaster it is, so general
        # advice goes first instead of advice written for some other disaster.
        return boost if scenario in tags else -boost

    def rank(self, query, resource=None, top_k=3, scenario=None):
        thresholds = THRESHOLDS[self.method]
        scored = zip(self._scores(query), self.catalog)

        # Known resource: only rank catalog items in its categories.
        # Unknown resource: search the whole catalog.
        categories = RESOURCE_CATEGORIES.get(resource)
       
        if categories:
            scored = [(score, item) for score, item in scored if item["category"] in categories]

        # Drop weak matches, so a 0.0 score is never shown as a recommendation.
        # The no_match check uses the raw score, so a boost can't rescue an unrelated item.
        ranked = sorted(
            [(score, item) for score, item in scored if score >= thresholds["no_match"]],
            key=lambda pair: pair[0] + self._scenario_adjustment(pair[1], scenario),
            reverse=True,
        )

        # Nothing relevant at all: give generic advice instead of a random match.
        if not ranked:
            return {"matched": False, "lowConfidence": True, "recommendations": [
                {**GENERIC_ADVICE, "confidence": None}
            ]}

        recommendations = [
            {
                "id": item["id"],
                "category": item["category"],
                "title": item["title"],
                "explanation": item["explanation"],
                "confidence": round(float(score), 3),
            }
            for score, item in ranked[:top_k]
        ]
        return {
            "matched": True,
            "lowConfidence": ranked[0][0] < thresholds["low_confidence"],
            "recommendations": recommendations,
        }
