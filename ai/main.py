import base64
import json
import os
from io import BytesIO
from typing import Any, Dict, List

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageFilter, ImageStat
from pydantic import BaseModel

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

    confidence = clamp(0.8 + severity_score * 0.18, 0.8, 0.98)

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


class ChatReplyRequest(BaseModel):
    accidentId: str
    userId: str
    history: List[Dict[str, Any]] = []


def heuristic_chat_reply(history: List[Dict[str, Any]]) -> str:
    latest_user_message = ""
    latest_ai_message = ""
    user_messages: List[str] = []

    for item in history:
        sender = item.get("senderType")
        text = str(item.get("message", "")).strip()
        if sender == "user" and text:
            user_messages.append(text.lower())
            latest_user_message = text.lower()
        elif sender == "ai" and text:
            latest_ai_message = text

    combined = " ".join(user_messages)
    if not combined:
        return "Tell me your exact location, how many people are injured, and whether anyone is unconscious, bleeding, or trapped."

    location_known = any(
        token in combined
        for token in [
            "my location is",
            "location is",
            "near",
            "at ",
            "road",
            "street",
            "avenue",
            "bridge",
            "signal",
            "highway",
            "landmark",
            "junction",
            "km",
        ]
    ) or any(char.isdigit() for char in combined)
    injury_known = any(
        token in combined
        for token in [
            "injured",
            "hurt",
            "bleeding",
            "blood",
            "broken",
            "pain",
            "unconscious",
            "not breathing",
            "breathing",
            "hit bad",
            "critical",
            "minor",
        ]
    )
    trapped_known = any(token in combined for token in ["trapped", "stuck inside", "stuck", "cannot move"])
    fire_known = any(token in combined for token in ["fire", "smoke", "burning"])
    count_known = any(
        token in combined
        for token in ["one ", "two ", "three ", "4 ", "5 ", "people", "person", "victim", "injured person"]
    )
    road_known = any(token in combined for token in ["road blocked", "traffic", "lane", "passable", "blocked"])
    safe_state_known = any(token in combined for token in ["safe", "okay", "fine", "conscious", "awake"])

    urgent = any(token in combined for token in ["unconscious", "not breathing", "bleeding heavily", "trapped", "fire"])

    if urgent and not location_known:
        reply = "This sounds serious. Share your exact location or nearest landmark immediately, and tell me if the injured person is breathing."
    elif urgent and not injury_known:
        reply = "I need a quick condition update: is the injured person conscious, breathing, or bleeding heavily?"
    elif not location_known:
        reply = "Share your exact location or nearest landmark so support can identify the scene correctly."
    elif not count_known:
        reply = "How many people are injured, and are any of them children or elderly?"
    elif not injury_known:
        reply = "Describe the injuries briefly. Is anyone unconscious, bleeding, unable to move, or complaining of severe pain?"
    elif not trapped_known and not fire_known:
        reply = "Is anyone trapped inside a vehicle, and do you see any smoke or fire?"
    elif not road_known:
        reply = "Is the road blocked, and are the vehicles in a dangerous position for other traffic?"
    elif not safe_state_known:
        reply = "Are you personally safe right now, and can you stay near the scene without risk?"
    else:
        reply = (
            "Understood. Keep the injured person safe and avoid moving them unless there is immediate danger. "
            "Send any new changes like loss of consciousness, heavy bleeding, fire, or a more precise location."
        )

    if latest_ai_message and latest_ai_message.strip() == reply.strip():
        follow_up_options = [
            "Also tell me whether anyone is trapped or if there is smoke or fire.",
            "If you can, send the nearest landmark, shop name, or road name.",
            "Tell me whether traffic is blocked and how many vehicles are involved.",
            "Tell me whether the injured person is conscious and breathing normally.",
        ]
        for option in follow_up_options:
            if option not in latest_ai_message:
                reply = option
                break

    return reply


def openai_chat_reply(history: List[Dict[str, Any]]) -> str:
    if not OpenAI:
        raise RuntimeError("openai package is not installed")

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")

    model = os.getenv("OPENAI_CHAT_MODEL", "gpt-4.1-mini")
    client = OpenAI(api_key=api_key)

    system_prompt = (
        "You are an emergency support assistant for a citizen accident reporting app. "
        "Reply in 1 to 3 short sentences. Ask focused triage questions, collect location and injury details, "
        "and avoid claiming that help has already arrived unless the chat says so. "
        "Do not mention being an AI unless directly asked. Do not repeat the same question if the citizen already answered it. "
        "Use the conversation context to ask the next missing incident detail."
    )

    transcript = "\n".join(
        f"{item.get('senderType', 'unknown')}: {item.get('message', '')}" for item in history[-12:]
    )

    response = client.responses.create(
        model=model,
        input=[
            {
                "role": "system",
                "content": [{"type": "input_text", "text": system_prompt}],
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": f"Conversation so far:\n{transcript}\n\nWrite the next assistant reply only."
                    }
                ],
            },
        ],
    )

    reply = (getattr(response, "output_text", "") or "").strip()
    if not reply:
        raise RuntimeError("Empty AI chat reply")
    return reply


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

    try:
        analysis["confidenceScore"] = round(
            clamp(float(analysis.get("confidenceScore", 0.8)), 0.8, 0.99),
            2,
        )
    except Exception:
        analysis["confidenceScore"] = 0.8

    analysis["inputContext"] = {
        "latitude": latitude,
        "longitude": longitude,
        "address": address,
        "cameraId": camera_id,
    }
    return {"success": True, "analysis": analysis}


@app.post("/chat-reply")
def chat_reply(payload: ChatReplyRequest) -> Dict[str, Any]:
    history = payload.history or []

    try:
        reply = openai_chat_reply(history)
    except Exception:
        reply = heuristic_chat_reply(history)

    return {"success": True, "reply": reply}
