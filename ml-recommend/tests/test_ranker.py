import json
import re
from pathlib import Path

import pytest

from app.ranker import SCENARIOS, Ranker, load_catalog

# Real sentences in the gap engine's format.
DRINKING = "Household of 4 has 3 of 6 gallons of drinking water needed for a 3-day tornado."
FOOD = "Household of 4 has 0 of 168 meals of food needed for a 14-day long-term power outage."
FLASHLIGHT = "Household of 4 has 0 of 1 pieces of flashlight needed for a 3-day tornado."
RADIO = "Household of 4 has 0 of 1 pieces of emergency radio needed for a 3-day flood."


@pytest.fixture(scope="module")
def semantic():
    ranker = Ranker()
    assert ranker.method == "semantic", "the sentence-transformers model failed to load"
    return ranker


@pytest.fixture(scope="module")
def tfidf():
    return Ranker(use_model=False)


def test_catalog_covers_every_required_category():
    categories = {item["category"] for item in load_catalog()}
    required = {"water", "food", "medical", "communication", "lighting", "sanitation", "shelter", "infant", "pets"}
    assert required <= categories


def test_catalog_ids_are_unique():
    ids = [item["id"] for item in load_catalog()]
    assert len(ids) == len(set(ids))


@pytest.mark.parametrize("ranker_name", ["semantic", "tfidf"])
@pytest.mark.parametrize(
    "query, resource, acceptable_first",
    [
        (DRINKING, "drinking_water", {"water-store-supply"}),
        # During a power outage, "no cooking needed" is also a good first answer.
        (FOOD, "food", {"food-shelf-stable", "food-no-cook"}),
        (FLASHLIGHT, "lighting", {"lighting-flashlights"}),
        (RADIO, "radio", {"communication-radio"}),
    ],
)
def test_shortages_rank_the_matching_action_first(request, ranker_name, query, resource, acceptable_first):
    result = request.getfixturevalue(ranker_name).rank(query, resource=resource)

    assert result["matched"] is True
    assert result["recommendations"][0]["id"] in acceptable_first


def test_scenario_words_do_not_outrank_the_shortage(semantic):
    # Without filtering by resource, "tornado" made the storm safe-room advice win.
    result = semantic.rank(DRINKING, resource="drinking_water")
    assert {r["category"] for r in result["recommendations"]} == {"water"}


def test_results_are_capped_and_sorted_by_confidence(semantic):
    recommendations = semantic.rank(DRINKING, resource="drinking_water", top_k=2)["recommendations"]

    assert len(recommendations) == 2
    assert recommendations[0]["confidence"] >= recommendations[1]["confidence"]


@pytest.mark.parametrize(
    "resource, description",
    [
        ("drinking_water", "Household of 4 has 3 of 28 gallons of drinking water needed for a 14-day long-term power outage."),
        ("food", FOOD),
        ("first_aid", "Household of 4 has 0 of 1 pieces of first aid kit needed for a 14-day long-term power outage."),
    ],
)
def test_long_power_outages_include_outage_specific_advice(semantic, resource, description):
    result = semantic.rank(description, resource=resource, scenario="powerOutage")
    ids = [r["id"] for r in result["recommendations"]]
    assert any(i.startswith("outage-") for i in ids), ids


def test_short_disasters_still_lead_with_general_advice(semantic):
    result = semantic.rank(DRINKING, resource="drinking_water")  # 3-day tornado
    assert not result["recommendations"][0]["id"].startswith("outage-")


def test_scenarios_match_the_backend():
    # The ranker copies the keys from the backend: a new scenario has to be added in both.
    backend = Path(__file__).parents[2] / "backend" / "src" / "config" / "scenarios.js"
    keys = set(re.findall(r"^\s{2}(\w+): \{", backend.read_text(), flags=re.MULTILINE))
    assert keys, "no scenario keys found in scenarios.js"
    assert keys == SCENARIOS


def test_catalog_rejects_unknown_scenario_tags(tmp_path):
    item = {"id": "x", "category": "water", "title": "t", "explanation": "e", "text": "t", "scenarios": ["tornadoo"]}
    path = tmp_path / "catalog.json"
    path.write_text(json.dumps([item]))
    with pytest.raises(ValueError, match="unknown scenarios"):
        load_catalog(path)


FLOOD_WATER = "Household of 4 has 0 of 6 gallons of drinking water needed for a 3-day flood."
WINTER_SANITATION = "Household of 3 has 0 of 1 pieces of sanitation supplies needed for a 7-day winter storm."


@pytest.mark.parametrize("ranker_name", ["semantic", "tfidf"])
def test_scenario_brings_in_advice_for_that_disaster(request, ranker_name):
    result = request.getfixturevalue(ranker_name).rank(FLOOD_WATER, resource="drinking_water", scenario="flood")
    assert "flood-water-unsafe-tap" in [r["id"] for r in result["recommendations"]]


@pytest.mark.parametrize("ranker_name", ["semantic", "tfidf"])
def test_advice_for_other_disasters_does_not_lead(request, ranker_name):
    # Without the scenario, tornado cleanup advice topped this winter storm shortage.
    result = request.getfixturevalue(ranker_name).rank(WINTER_SANITATION, resource="sanitation", scenario="winterStorm")
    assert result["recommendations"][0]["id"] in {"sanitation-hygiene-kit", "sanitation-waste"}


@pytest.mark.parametrize("ranker_name", ["semantic", "tfidf"])
def test_scenario_does_not_override_the_shortage(request, ranker_name):
    medication = "Household of 1 has 2 of 10 days of medication needed for a 10-day tornado."
    result = request.getfixturevalue(ranker_name).rank(medication, resource="medication", scenario="tornado")
    assert result["recommendations"][0]["id"] == "medical-prescriptions"


def test_confidence_is_the_raw_score_not_the_boosted_one(semantic):
    plain = semantic.rank(FLOOD_WATER, resource="drinking_water", top_k=5)
    boosted = semantic.rank(FLOOD_WATER, resource="drinking_water", top_k=5, scenario="flood")
    plain_scores = {r["id"]: r["confidence"] for r in plain["recommendations"]}
    for r in boosted["recommendations"]:
        if r["id"] in plain_scores:
            assert r["confidence"] == plain_scores[r["id"]]


@pytest.mark.parametrize("ranker_name", ["semantic", "tfidf"])
def test_no_scenario_leads_with_general_advice(request, ranker_name):
    # Older callers don't send a scenario: flood-only advice shouldn't top a tornado shortage.
    result = request.getfixturevalue(ranker_name).rank(DRINKING, resource="drinking_water")
    assert result["recommendations"][0]["id"] == "water-store-supply"


def test_unknown_scenario_ranks_like_no_scenario(semantic):
    plain = semantic.rank(FLOOD_WATER, resource="drinking_water")
    assert semantic.rank(FLOOD_WATER, resource="drinking_water", scenario="earthquake") == plain


@pytest.mark.parametrize("ranker_name", ["semantic", "tfidf"])
def test_unrelated_text_is_flagged_low_confidence(request, ranker_name):
    result = request.getfixturevalue(ranker_name).rank("The quarterly sales report is due on Friday.")
    assert result["lowConfidence"] is True


def test_no_match_returns_generic_advice(tfidf):
    result = tfidf.rank("asdf qwerty zxcv")

    assert result["matched"] is False
    assert result["recommendations"][0]["id"] == "generic-kit"


def test_falls_back_to_tfidf_when_the_model_fails(monkeypatch):
    import sentence_transformers

    def broken_model(*args, **kwargs):
        raise OSError("model download failed")

    monkeypatch.setattr(sentence_transformers, "SentenceTransformer", broken_model)
    ranker = Ranker()

    assert ranker.method == "tfidf"
    assert ranker.rank(DRINKING, resource="drinking_water")["recommendations"][0]["id"] == "water-store-supply"


@pytest.mark.parametrize("ranker_name", ["semantic", "tfidf"])
def test_unknown_resource_gets_generic_advice_not_a_catalog_guess(request, ranker_name):
    # "drinking_watr" used to search the whole catalog and return sanitation advice, marked matched.
    result = request.getfixturevalue(ranker_name).rank(DRINKING, resource="drinking_watr")

    assert result["matched"] is False
    assert [r["id"] for r in result["recommendations"]] == ["generic-kit"]


def test_no_resource_still_searches_the_whole_catalog(tfidf):
    result = tfidf.rank(DRINKING)
    assert result["matched"] is True
    assert result["recommendations"][0]["category"] == "water"
