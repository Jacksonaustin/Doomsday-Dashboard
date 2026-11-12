import pytest

from app.ranker import Ranker, load_catalog

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
    required = {"water", "food", "medical", "communication", "lighting", "sanitation", "shelter"}
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
