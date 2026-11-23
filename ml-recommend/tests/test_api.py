import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client():
    # The fallback keeps the API tests fast. test_ranker.py covers the real model.
    with pytest.MonkeyPatch.context() as patch:
        patch.setenv("AI_FORCE_FALLBACK", "1")
        from app.main import app

        with TestClient(app) as test_client:  # "with" runs the startup code
            yield test_client


def test_health_reports_the_ranking_method(client):
    body = client.get("/health").json()
    assert body["success"] is True
    assert body["data"]["method"] == "tfidf"


def test_recommendations_are_returned_most_severe_first(client):
    response = client.post("/recommendations", json={"shortages": [
        {"resource": "lighting", "severity": "high",
         "description": "Household of 4 has 0 of 1 pieces of flashlight needed for a 3-day tornado."},
        {"resource": "drinking_water", "severity": "critical",
         "description": "Household of 4 has 3 of 6 gallons of drinking water needed for a 3-day tornado."},
    ]})
    body = response.json()

    assert response.status_code == 200
    assert body["success"] is True
    assert [r["resource"] for r in body["data"]["results"]] == ["drinking_water", "lighting"]
    assert len(body["data"]["results"][0]["recommendations"]) <= 3
    assert "suggestions only" in body["data"]["advisory"]


def test_empty_shortage_list_is_allowed(client):
    body = client.post("/recommendations", json={"shortages": []}).json()
    assert body["data"]["results"] == []

@pytest.mark.parametrize("scenario", ["flood", None, "notAScenario"])
def test_scenario_is_optional_and_unknown_keys_still_work(client, scenario):
    response = client.post("/recommendations", json={"scenario": scenario, "shortages": [
        {"resource": "drinking_water", "severity": "critical",
         "description": "Household of 4 has 0 of 6 gallons of drinking water needed for a 3-day flood."},
    ]})
    assert response.status_code == 200
    assert response.json()["data"]["results"][0]["matched"] is True


def test_overlong_scenario_is_rejected(client):
    assert client.post("/recommendations", json={"scenario": "x" * 51, "shortages": []}).status_code == 422

@pytest.mark.parametrize("payload", [
    {},
    {"shortages": [{"resource": "food"}]},
    {"shortages": [{"resource": "food", "description": "x" * 501}]},
    {"shortages": [{"resource": "food", "description": "hungry"}] * 21},
    {"shortages": [], "top_k": 50},
])
def test_invalid_requests_are_rejected(client, payload):
    assert client.post("/recommendations", json=payload).status_code == 422

def test_food_is_classified(client):
    body = client.post("/food/classify", json={"name": "6 cans chicken noodle soup"}).json()

    assert body["success"] is True
    assert body["data"]["matched"] is True
    assert body["data"]["resourceType"] == "meal"
    assert body["data"]["quantity"] == 6


def test_unknown_food_is_not_guessed(client):
    body = client.post("/food/classify", json={"name": "dog leash"}).json()
    assert body["data"]["matched"] is False
    assert body["message"] == "Not sure what this is"


@pytest.mark.parametrize("payload", [{}, {"name": ""}, {"name": "x" * 101}])
def test_invalid_food_requests_are_rejected(client, payload):
    assert client.post("/food/classify", json=payload).status_code == 422


def test_one_unknown_resource_does_not_break_the_rest(client):
    response = client.post("/recommendations", json={"shortages": [
        {"resource": "drinking_watr", "severity": "critical",
         "description": "Household of 4 has 0 of 6 gallons of drinking water needed for a 3-day flood."},
        {"resource": "lighting", "severity": "high",
         "description": "Household of 4 has 0 of 1 pieces of flashlight needed for a 3-day flood."},
    ]})
    results = {r["resource"]: r for r in response.json()["data"]["results"]}

    assert response.status_code == 200
    assert results["drinking_watr"]["matched"] is False
    assert results["lighting"]["matched"] is True
