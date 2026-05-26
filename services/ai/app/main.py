"""Open Music AI service skeleton.

Real endpoints (embeddings, reranking, taste profiling) are implemented in
Phase 2 tasks of the implementation plan.
"""

from fastapi import FastAPI

app = FastAPI(title="Open Music AI", version="0.0.0")


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}
