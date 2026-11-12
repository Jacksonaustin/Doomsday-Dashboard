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


@pytest.mark.parametrize("payload", [
    {},
    {"shortages": [{"resource": "food"}]},
    {"shortages": [{"resource": "food", "description": "x" * 501}]},
    {"shortages": [{"resource": "food", "description": "hungry"}] * 21},
    {"shortages": [], "top_k": 50},
])
def test_invalid_requests_are_rejected(client, payload):
    assert client.post("/recommendations", json=payload).status_code == 422
