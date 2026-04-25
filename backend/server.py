from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.encoders import jsonable_encoder
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Optional
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")


# --------- Scoring schema (must match frontend src/lib/scoring.js) ---------
CATEGORIES = [
    {
        "id": "location",
        "name": "Location Quality",
        "weight": 15,
        "sub_factors": [
            {"id": "loc_area", "name": "Area desirability (Ikeja / Lekki Phase 1 strength)", "weight": 6},
            {"id": "loc_landmarks", "name": "Proximity to landmarks (restaurants, malls, hotspots)", "weight": 4},
            {"id": "loc_access", "name": "Accessibility (road quality, traffic entry/exit)", "weight": 3},
            {"id": "loc_security", "name": "Security perception", "weight": 2},
        ],
    },
    {
        "id": "property",
        "name": "Property Quality",
        "weight": 20,
        "sub_factors": [
            {"id": "prop_interior", "name": "Interior finishing", "weight": 6},
            {"id": "prop_layout", "name": "Space design & layout", "weight": 4},
            {"id": "prop_amenities", "name": "Amenities (AC, WiFi, power, etc.)", "weight": 5},
            {"id": "prop_maintenance", "name": "Maintenance condition & frequency", "weight": 5},
        ],
    },
    {
        "id": "media",
        "name": "Media & Marketing Appeal",
        "weight": 10,
        "sub_factors": [
            {"id": "media_visual", "name": "Visual appeal (aesthetic attractiveness)", "weight": 10},
        ],
    },
    {
        "id": "pricing",
        "name": "Pricing & Value Alignment",
        "weight": 15,
        "sub_factors": [
            {"id": "price_competitive", "name": "Competitive pricing vs market", "weight": 6},
            {"id": "price_value", "name": "Value for money perception", "weight": 5},
            {"id": "price_consistency", "name": "Pricing consistency", "weight": 4},
        ],
    },
    {
        "id": "availability",
        "name": "Availability Reliability",
        "weight": 15,
        "sub_factors": [
            {"id": "avail_calendar", "name": "Calendar accuracy", "weight": 6},
            {"id": "avail_response", "name": "Owner responsiveness", "weight": 5},
            {"id": "avail_doublebook", "name": "Risk of double booking", "weight": 4},
        ],
    },
    {
        "id": "owner",
        "name": "Owner / Manager Alignment",
        "weight": 10,
        "sub_factors": [
            {"id": "own_instant", "name": "Willingness for instant booking", "weight": 3},
            {"id": "own_pricing", "name": "Willingness to honor pricing", "weight": 2},
            {"id": "own_speed", "name": "Responsiveness speed", "weight": 2},
            {"id": "own_pro", "name": "Professionalism", "weight": 1.5},
            {"id": "own_comm", "name": "Communication reliability", "weight": 1.5},
        ],
    },
    {
        "id": "conversion",
        "name": "Conversion Potential",
        "weight": 10,
        "sub_factors": [
            {"id": "conv_visual", "name": "Visual-driven conversion likelihood", "weight": 3},
            {"id": "conv_offer", "name": "Offer strength", "weight": 3},
            {"id": "conv_demand", "name": "Market demand alignment", "weight": 4},
        ],
    },
    {
        "id": "operational",
        "name": "Operational Feasibility",
        "weight": 5,
        "sub_factors": [
            {"id": "op_onboard", "name": "Ease of onboarding", "weight": 2},
            {"id": "op_manage", "name": "Ease of managing bookings", "weight": 2},
            {"id": "op_risk", "name": "Risk level (refunds, disputes)", "weight": 1},
        ],
    },
]

# Build a flat lookup: sub_factor_id -> weight
SUBFACTOR_WEIGHTS: Dict[str, float] = {}
SUBFACTOR_TO_CATEGORY: Dict[str, str] = {}
for cat in CATEGORIES:
    for sf in cat["sub_factors"]:
        SUBFACTOR_WEIGHTS[sf["id"]] = sf["weight"]
        SUBFACTOR_TO_CATEGORY[sf["id"]] = cat["id"]


def compute_score(scores: Dict[str, int]) -> dict:
    """Compute total weighted score, per-category breakdown, tier, and override."""
    total = 0.0
    category_totals: Dict[str, dict] = {}
    for cat in CATEGORIES:
        cat_earned = 0.0
        cat_max = 0.0
        for sf in cat["sub_factors"]:
            raw = scores.get(sf["id"], 0)
            try:
                raw = int(raw)
            except (ValueError, TypeError):
                raw = 0
            raw = max(0, min(5, raw))
            earned = (raw / 5.0) * sf["weight"]
            total += earned
            cat_earned += earned
            cat_max += sf["weight"]
        pct = (cat_earned / cat_max * 100.0) if cat_max else 0.0
        category_totals[cat["id"]] = {
            "earned": round(cat_earned, 2),
            "max": cat_max,
            "percent": round(pct, 1),
        }

    total = round(total, 2)

    # Tier
    if total >= 80:
        tier = 1
    elif total >= 65:
        tier = 2
    else:
        tier = 3

    # Override rule: if Availability OR Owner Alignment category percentage < 60%, block Tier 1
    override_reason = None
    can_instant_book = tier == 1
    avail_pct = category_totals["availability"]["percent"]
    owner_pct = category_totals["owner"]["percent"]
    if tier == 1:
        weak = []
        if avail_pct < 60:
            weak.append("Availability Reliability")
        if owner_pct < 60:
            weak.append("Owner Alignment")
        if weak:
            can_instant_book = False
            override_reason = (
                f"Score qualifies for Tier 1 but {' and '.join(weak)} is weak "
                f"(< 60%). Property cannot be marked Instant Booking."
            )

    tier_label = {
        1: "Tier 1 — Instant Booking Eligible",
        2: "Tier 2 — Non-Instant Booking",
        3: "Tier 3 — Reject / Waitlist",
    }[tier]

    return {
        "total_score": total,
        "tier": tier,
        "tier_label": tier_label,
        "can_instant_book": can_instant_book,
        "override_reason": override_reason,
        "category_breakdown": category_totals,
    }


# --------- Models ---------
class EvaluationCreate(BaseModel):
    name: str
    location: str
    advisor_name: Optional[str] = ""
    notes: Optional[str] = ""
    scores: Dict[str, int]


class EvaluationUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    advisor_name: Optional[str] = None
    notes: Optional[str] = None
    scores: Optional[Dict[str, int]] = None


class Evaluation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    location: str
    advisor_name: str = ""
    notes: str = ""
    scores: Dict[str, int]
    total_score: float
    tier: int
    tier_label: str
    can_instant_book: bool
    override_reason: Optional[str] = None
    category_breakdown: Dict[str, dict]
    created_at: datetime
    updated_at: datetime


# --------- Routes ---------
@api_router.get("/")
async def root():
    return {"message": "Shortlet Property Scoring API"}


@api_router.get("/scoring/schema")
async def get_schema():
    return {"categories": CATEGORIES}


@api_router.post("/scoring/preview")
async def preview_score(scores: Dict[str, int]):
    return compute_score(scores)


def _serialize(doc: dict) -> dict:
    if isinstance(doc.get("created_at"), str):
        doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    if isinstance(doc.get("updated_at"), str):
        doc["updated_at"] = datetime.fromisoformat(doc["updated_at"])
    return doc


@api_router.post("/evaluations", response_model=Evaluation)
async def create_evaluation(payload: EvaluationCreate):
    if not payload.name.strip() or not payload.location.strip():
        raise HTTPException(status_code=400, detail="Name and location are required")
    computed = compute_score(payload.scores)
    now = datetime.now(timezone.utc)
    evaluation = {
        "id": str(uuid.uuid4()),
        "name": payload.name.strip(),
        "location": payload.location.strip(),
        "advisor_name": (payload.advisor_name or "").strip(),
        "notes": (payload.notes or "").strip(),
        "scores": payload.scores,
        **computed,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }
    await db.evaluations.insert_one({**evaluation})
    return Evaluation(**_serialize(dict(evaluation)))


@api_router.get("/evaluations", response_model=List[Evaluation])
async def list_evaluations(tier: Optional[int] = None, q: Optional[str] = None):
    query: dict = {}
    if tier in (1, 2, 3):
        query["tier"] = tier
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"location": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.evaluations.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [Evaluation(**_serialize(d)) for d in docs]


@api_router.get("/evaluations/{eval_id}", response_model=Evaluation)
async def get_evaluation(eval_id: str):
    doc = await db.evaluations.find_one({"id": eval_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    return Evaluation(**_serialize(doc))


@api_router.put("/evaluations/{eval_id}", response_model=Evaluation)
async def update_evaluation(eval_id: str, payload: EvaluationUpdate):
    existing = await db.evaluations.find_one({"id": eval_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "scores" in update_data:
        computed = compute_score(update_data["scores"])
        update_data.update(computed)
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.evaluations.update_one({"id": eval_id}, {"$set": update_data})
    doc = await db.evaluations.find_one({"id": eval_id}, {"_id": 0})
    return Evaluation(**_serialize(doc))


@api_router.delete("/evaluations/{eval_id}")
async def delete_evaluation(eval_id: str):
    res = await db.evaluations.delete_one({"id": eval_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    return {"ok": True}


@api_router.get("/stats")
async def stats():
    total = await db.evaluations.count_documents({})
    t1 = await db.evaluations.count_documents({"tier": 1})
    t2 = await db.evaluations.count_documents({"tier": 2})
    t3 = await db.evaluations.count_documents({"tier": 3})
    instant = await db.evaluations.count_documents({"can_instant_book": True})
    return {
        "total": total,
        "tier1": t1,
        "tier2": t2,
        "tier3": t3,
        "instant_eligible": instant,
    }


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
