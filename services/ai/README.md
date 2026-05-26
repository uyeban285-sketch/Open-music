# services/ai

AI-сервис Open Music (FastAPI, Python 3.11). Каркас под Phase 2 — embedding, reranking, taste profiling.

## Запуск (локально)

```bash
cd services/ai
python -m venv .venv
. .venv/Scripts/activate    # Windows
# source .venv/bin/activate # macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

Реализация эндпоинтов — в задачах AI-блока плана.
