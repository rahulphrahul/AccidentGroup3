# AI Service

FastAPI service for accident-image analysis.

## Run

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Provider

- If `OPENAI_API_KEY` is set, the service will try a vision model first.
- Otherwise it falls back to a local heuristic image analyzer and still returns the same JSON contract.

## Endpoint

- `POST /analyze-image`
  - multipart form fields: `file`, optional `latitude`, `longitude`, `address`, `camera_id`
