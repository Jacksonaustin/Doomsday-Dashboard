"""Recognizes a food item from what the user types, e.g. "6 cans chicken noodle soup".

Plain code pulls out the count and package size. The rest of the text is matched
against food_catalog.json with the ranker's sentence-transformers model, or TF-IDF
if the model didn't load, so the guess can prefill the inventory form.

The catalog also lists common non-food supplies (resourceType null). When one of
those is the closest match, nothing is guessed, so "dog leash" doesn't become dog food.
"""

import json
import re
from pathlib import Path

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

FOOD_CATALOG_PATH = Path(__file__).parent / "food_catalog.json"

# Inventory resource types a food item can be (backend/src/config/resourceTypes.js).
FOOD_RESOURCE_TYPES = {"meal", "infant_food", "pet_food"}

# Below this score nothing is guessed: a confident wrong guess is worse than none.
# Picked with eval/run_food_eval.py --sweep as the lowest value with no wrong guesses
# on the eval set. Retune if the catalog changes.
MIN_CONFIDENCE = {"semantic": 0.5, "tfidf": 0.4}

MAX_QUANTITY = 1000  # anything bigger is more likely a typo than a count

# Package sizes like "10.75 oz" or "30lb" describe the package, not how many there are.
SIZE = re.compile(
    r"\b\d+(?:\.\d+)?\s*(?:fl\.?\s*oz|oz|ounces?|lbs?|pounds?|kg|g|grams?|ml|l|liters?|litres?)\b",
    re.IGNORECASE,
)
# A count at the start: "6 cans ...", "10 MREs", "3x ...".
COUNT = re.compile(r"^\s*(\d+)\s*(?:x\b)?\s*", re.IGNORECASE)


def parse_text(text):
    """Split "6 cans soup 10.5 oz" into (6, "cans soup"). The count is None if there isn't one."""
    name = SIZE.sub(" ", text)
    quantity = None
    match = COUNT.match(name)
    if match:
        quantity = int(match.group(1))
        name = name[match.end():]
        if not 0 < quantity <= MAX_QUANTITY:
            quantity = None
    return quantity, " ".join(name.split())


def load_food_catalog(path=FOOD_CATALOG_PATH):
    catalog = json.loads(Path(path).read_text())
    required = {"id", "name", "resourceType", "perishable", "needsCooking", "mealsPerUnit", "shelfLifeDays", "text"}
    for item in catalog:
        missing = required - item.keys()
        if missing:
            raise ValueError(f"Food item {item.get('id')} is missing {sorted(missing)}")
        if item["resourceType"] is not None and item["resourceType"] not in FOOD_RESOURCE_TYPES:
            raise ValueError(f"Food item {item['id']} has unknown resourceType {item['resourceType']!r}")
    return catalog


class FoodClassifier:
    def __init__(self, catalog=None, model=None):
        """model: an already-loaded SentenceTransformer (the ranker's), or None for TF-IDF."""
        self.catalog = catalog if catalog is not None else load_food_catalog()
        texts = [f"{item['name']}, {item['text']}" for item in self.catalog]

        # Letter chunks instead of words, so typos ("spagetti") and run-together
        # words ("peanutbutter") still match.
        self.tfidf = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5)).fit(texts)
        self.tfidf_catalog = self.tfidf.transform(texts)

        self.model = model
        self.method = "tfidf"
        if model is not None:
            self.catalog_embeddings = model.encode(texts, normalize_embeddings=True)
            self.method = "semantic"

    def _scores(self, name):
        if self.model is not None:
            embedding = self.model.encode([name], normalize_embeddings=True)
            return (embedding @ self.catalog_embeddings.T)[0].tolist()
        return cosine_similarity(self.tfidf.transform([name]), self.tfidf_catalog)[0].tolist()

    def classify(self, text):
        quantity, name = parse_text(text)
        if not name:
            return {"matched": False, "quantity": quantity, "confidence": None}

        scores = self._scores(name)
        best = max(range(len(scores)), key=scores.__getitem__)
        confidence = round(float(scores[best]), 3)

        item = self.catalog[best]
        if confidence < MIN_CONFIDENCE[self.method] or item["resourceType"] is None:
            return {"matched": False, "quantity": quantity, "confidence": confidence}

        meals = item["mealsPerUnit"]
        return {
            "matched": True,
            "quantity": quantity,
            "confidence": confidence,
            "match": {"id": item["id"], "name": item["name"]},
            "resourceType": item["resourceType"],
            "perishable": item["perishable"],
            "needsCooking": item["needsCooking"],
            # Rough guesses for the form to prefill. The user should be able to change them.
            "mealsPerUnit": meals,
            "estimatedMeals": round(quantity * meals, 1) if quantity and meals else None,
            "shelfLifeDays": item["shelfLifeDays"],
        }