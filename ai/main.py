import base64
import json
import os
from io import BytesIO
from typing import Any, Dict

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageFilter, ImageStat

try:
    from openai import OpenAI
except ImportError:  # pragma: no cover
    OpenAI = None


app = FastAPI(title="Accident Image AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def heuristic_analysis(image_bytes: bytes, filename: str) -> Dict[str, Any]:
    try:
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=400, detail=f"Invalid image file: {exc}") from exc

    resized = image.resize((224, 224))
    grayscale = resized.convert("L")
    edges = grayscale.filter(ImageFilter.FIND_EDGES)

    gray_stat = ImageStat.Stat(grayscale)
    edge_stat = ImageStat.Stat(edges)
    rgb_stat = ImageStat.Stat(resized)

    contrast = gray_stat.stddev[0] / 64.0
    edge_density = edge_stat.mean[0] / 255.0
    red_strength = clamp((rgb_stat.mean[0] - max(rgb_stat.mean[1], rgb_stat.mean[2])) / 255.0, 0.0, 1.0)
    brightness = gray_stat.mean[0] / 255.0

    severity_score = (
        edge_density * 0.45
        + contrast * 0.30
        + red_strength * 0.20
        + (0.15 if brightness < 0.35 else 0.0)
    )
    severity_score = clamp(severity_score, 0.0, 1.0)

    if severity_score >= 0.72:
        severity = "Critical"
    elif severity_score >= 0.53:
        severity = "High"
    elif severity_score >= 0.33:
        severity = "Medium"
    else:
        severity = "Low"

    confidence = clamp(0.55 + severity_score * 0.35, 0.55, 0.96)

    return {
        "provider": "heuristic-vision",
        "accidentDetected": severity_score >= 0.28,
        "severity": severity,
        "confidenceScore": round(confidence, 2),
        "summary": (
            "Estimated accident severity from image texture, contrast, edge density, and color cues. "
            "Use as operator assistance, not as medical truth."
        ),
        "signals": {
            "edgeDensity": round(edge_density, 3),
            "contrast": round(contrast, 3),
            "redStrength": round(red_strength, 3),
            "brightness": round(brightness, 3),
        },
        "filename": filename,
    }


def openai_analysis(image_bytes: bytes, filename: str, mime_type: str) -> Dict[str, Any]:
    if not OpenAI:
        raise RuntimeError("openai package is not installed")

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")

    model = os.getenv("OPENAI_VISION_MODEL", "gpt-4.1-mini")
    client = OpenAI(api_key=api_key)
    encoded = base64.b64encode(image_bytes).decode("utf-8")
    prompt = (
        "You are analyzing an uploaded road accident image for a traffic-emulation system. "
        "Return strict JSON with keys: accidentDetected(boolean), severity(one of Low, Medium, High, Critical), "
        "confidenceScore(number 0 to 1), summary(string), signals(object with short booleans or strings). "
        "Base the result only on visible cues in the image."
    )

    response = client.responses.create(
        model=model,
        input=[
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": prompt},
                    {"type": "input_image", "image_url": f"data:{mime_type};base64,{encoded}"},
                ],
            }
        ],
    )

    output_text = getattr(response, "output_text", "") or ""
    parsed = json.loads(output_text)
    parsed["provider"] = f"openai:{model}"
    parsed["filename"] = filename
    return parsed


@app.get("/health")
def health() -> Dict[str, Any]:
    provider = "openai" if os.getenv("OPENAI_API_KEY") else "heuristic-vision"
    return {"success": True, "status": "ok", "provider": provider}


@app.post("/analyze-image")
async def analyze_image(
    file: UploadFile = File(...),
    latitude: str = Form(""),
    longitude: str = Form(""),
    address: str = Form(""),
    camera_id: str = Form(""),
) -> Dict[str, Any]:
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Image file is required")

    mime_type = file.content_type or "image/jpeg"

    try:
        analysis = openai_analysis(image_bytes, file.filename or "upload", mime_type)
    except Exception:
        analysis = heuristic_analysis(image_bytes, file.filename or "upload")

    analysis["inputContext"] = {
        "latitude": latitude,
        "longitude": longitude,
        "address": address,
        "cameraId": camera_id,
    }
    return {"success": True, "analysis": analysis}
