from contextlib import asynccontextmanager

from fastapi import FastAPI
from pydantic import BaseModel, Field

from .ranker import Ranker

ranker = None


@asynccontextmanager
async def lifespan(app):
    global ranker
    ranker = Ranker()  # load the model once at startup, not on every request
    yield


app = FastAPI(title="Doomsday Dashboard AI Service", lifespan=lifespan)

SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2}


class Shortage(BaseModel):
    resource: str = Field(min_length=1, max_length=50)
    severity: str = Field(default="medium", max_length=20)
    description: str = Field(min_length=1, max_length=500)


class RecommendationRequest(BaseModel):
    shortages: list[Shortage] = Field(max_length=20)
    top_k: int = Field(default=3, ge=1, le=5)


@app.get("/health")
def health():
    return {"success": True, "data": {"status": "ok", "method": ranker.method}, "message": "AI service is ready"}


@app.post("/recommendations")
def recommendations(request: RecommendationRequest):
    # Most serious shortages first.
    shortages = sorted(request.shortages, key=lambda s: SEVERITY_ORDER.get(s.severity, 3))

    results = []
    for shortage in shortages:
        ranked = ranker.rank(shortage.description, resource=shortage.resource, top_k=request.top_k)
        results.append({"resource": shortage.resource, "severity": shortage.severity, **ranked})

    return {
        "success": True,
        "data": {
            "method": ranker.method,
            "advisory": "Recommendations are suggestions only and may not fit every household.",
            "results": results,
        },
        "message": "Recommendations ranked" if results else "No shortages to rank",
    }
