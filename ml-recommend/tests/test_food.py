import json

import pytest

from app.food import FOOD_RESOURCE_TYPES, FoodClassifier, load_food_catalog, parse_text
from app.ranker import MODEL_NAME


@pytest.fixture(scope="module")
def semantic():
    from sentence_transformers import SentenceTransformer

    return FoodClassifier(model=SentenceTransformer(MODEL_NAME))


@pytest.fixture(scope="module")
def tfidf():
    return FoodClassifier()


@pytest.mark.parametrize(
    "text, quantity, name",
    [
        ("6 cans chicken noodle soup", 6, "cans chicken noodle soup"),
        ("Campbell's tomato soup 10.75 oz", None, "Campbell's tomato soup"),
        ("20 lb bag of rice", None, "bag of rice"),  # a package size, not a count
        ("dog kibble 30lb", None, "dog kibble"),
        ("3x granola bars", 3, "granola bars"),
        ("0 cans of beans", None, "cans of beans"),
        ("99999 MREs", None, "MREs"),
    ],
)
def test_parse_text_separates_count_and_size(text, quantity, name):
    assert parse_text(text) == (quantity, name)


def test_food_catalog_ids_are_unique_and_types_are_known():
    catalog = load_food_catalog()
    assert len({item["id"] for item in catalog}) == len(catalog)
    assert {item["resourceType"] for item in catalog} == FOOD_RESOURCE_TYPES | {None}


def test_food_catalog_rejects_unknown_resource_types(tmp_path):
    item = {"id": "x", "name": "x", "resourceType": "snack", "perishable": False, "needsCooking": False,
            "mealsPerUnit": 1, "shelfLifeDays": 1, "text": "x"}
    path = tmp_path / "food_catalog.json"
    path.write_text(json.dumps([item]))
    with pytest.raises(ValueError, match="unknown resourceType"):
        load_food_catalog(path)


@pytest.mark.parametrize("classifier_name", ["semantic", "tfidf"])
@pytest.mark.parametrize(
    "text, resource_type, perishable, needs_cooking",
    [
        ("6 cans chicken noodle soup", "meal", False, False),
        ("bag of white rice", "meal", False, True),
        ("frozen pizza", "meal", True, True),
        ("powdered baby formula", "infant_food", False, False),
        ("dry dog food", "pet_food", False, False),
    ],
)
def test_common_foods_are_recognized(request, classifier_name, text, resource_type, perishable, needs_cooking):
    result = request.getfixturevalue(classifier_name).classify(text)

    assert result["matched"] is True
    assert (result["resourceType"], result["perishable"], result["needsCooking"]) == (
        resource_type, perishable, needs_cooking)


@pytest.mark.parametrize("classifier_name", ["semantic", "tfidf"])
@pytest.mark.parametrize("text", ["dog leash", "baby wipes", "flashlight", "the quarterly sales report"])
def test_non_food_gets_no_guess(request, classifier_name, text):
    # "dog leash" shares a word with dog food: the non-food catalog entries stop that.
    assert request.getfixturevalue(classifier_name).classify(text)["matched"] is False


def test_meals_are_estimated_from_the_count(semantic):
    result = semantic.classify("6 cans chicken noodle soup")
    assert result["quantity"] == 6
    assert result["estimatedMeals"] == 6 * result["mealsPerUnit"]


def test_no_count_means_no_meal_estimate(semantic):
    result = semantic.classify("canned soup")
    assert result["quantity"] is None
    assert result["estimatedMeals"] is None


def test_infant_and_pet_food_have_no_meal_estimate(semantic):
    # The backend measures these in days, not meals.
    assert semantic.classify("4 cans of dog food")["mealsPerUnit"] is None


def test_typos_still_match_with_tfidf(tfidf):
    # The fallback compares letter chunks, so a misspelled name still matches.
    assert tfidf.classify("peanutbutter")["matched"] is True


def test_empty_name_after_parsing_gets_no_guess(tfidf):
    assert tfidf.classify("12 oz")["matched"] is False