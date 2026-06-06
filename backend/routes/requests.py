# backend/routes/requests.py

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from decimal import Decimal
from datetime import datetime
import uuid
import logging
from backend.services.dynamodb_service import DynamoDBService
from backend.services.matching_service import MatchingService

router = APIRouter()
logger = logging.getLogger(__name__)

# Allowed blood groups
ALLOWED_BLOOD_GROUPS = {"A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"}
ALLOWED_URGENCY = {"Critical", "High", "Routine"}

# Dependency Injection
def get_db_service():
    return DynamoDBService()

def get_matching_service():
    db_service = DynamoDBService()
    return MatchingService(db_service)

# --- Pydantic Schemas ---

class BloodRequestCreate(BaseModel):
    patient_name: str = Field(..., min_length=1, max_length=100)
    blood_group: str
    urgency: str
    hospital_name: str = Field(..., min_length=1, max_length=200)
    hospital_city: str = Field(..., min_length=1, max_length=100)
    hospital_state: str = Field(default="", max_length=100)
    contact_phone: str = Field(..., min_length=5, max_length=20)
    units_required: int = Field(..., ge=1, le=50)
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    @field_validator('blood_group')
    @classmethod
    def validate_blood_group(cls, value: str) -> str:
        bg = value.strip().upper()
        verbal_mapping = {
            "A POSITIVE": "A+", "A NEGATIVE": "A-",
            "B POSITIVE": "B+", "B NEGATIVE": "B-",
            "AB POSITIVE": "AB+", "AB NEGATIVE": "AB-",
            "O POSITIVE": "O+", "O NEGATIVE": "O-"
        }
        if bg in verbal_mapping:
            bg = verbal_mapping[bg]
        if bg not in ALLOWED_BLOOD_GROUPS:
            raise ValueError(f"Blood group must be one of: {', '.join(sorted(ALLOWED_BLOOD_GROUPS))}")
        return bg

    @field_validator('urgency')
    @classmethod
    def validate_urgency(cls, value: str) -> str:
        # Capitalize first letter for consistency
        normalized = value.strip().capitalize()
        if normalized not in ALLOWED_URGENCY:
            raise ValueError(f"Urgency must be one of: {', '.join(sorted(ALLOWED_URGENCY))}")
        return normalized


class MatchedDonorBrief(BaseModel):
    user_id: str
    blood_group: str
    gender: Optional[str] = None
    donations_till_date: Optional[int] = 0
    donor_type: Optional[str] = None
    calls_to_donations_ratio: Optional[float] = None
    distance_km: Optional[float] = None
    is_soft_eligible: Optional[bool] = False
    days_until_eligible: Optional[int] = None


class BloodRequestResponse(BaseModel):
    success: bool
    request_id: str
    message: str
    matched_donors: List[MatchedDonorBrief]


# --- Endpoint ---

@router.post("/requests/create", response_model=BloodRequestResponse)
def create_blood_request(
    payload: BloodRequestCreate,
    db_service: DynamoDBService = Depends(get_db_service),
    match_service: MatchingService = Depends(get_matching_service)
):
    """
    POST /api/requests/create
    Creates a blood request, saves to BloodBridge_Requests table,
    and returns top 5 matched donors.
    """
    try:
        # Generate a unique request_id
        request_id = str(uuid.uuid4())

        # Resolve coordinates
        lat = payload.latitude
        lon = payload.longitude
        if lat is None or lon is None:
            state_clean = payload.hospital_state.strip().title()
            from backend.utils.location_mapper import STATE_CENTROIDS
            if state_clean in STATE_CENTROIDS:
                lat, lon = STATE_CENTROIDS[state_clean]

        # Build the request record
        request_item = {
            "request_id": request_id,
            "patient_name": payload.patient_name.strip(),
            "blood_group": payload.blood_group,
            "urgency": payload.urgency,
            "hospital_name": payload.hospital_name.strip(),
            "hospital_city": payload.hospital_city.strip(),
            "hospital_state": payload.hospital_state.strip(),
            "contact_phone": payload.contact_phone.strip(),
            "units_required": payload.units_required,
            "status": "open",
            "created_at": datetime.utcnow().isoformat(),
            "latitude": lat,
            "longitude": lon
        }

        # Save the request to DynamoDB
        saved = db_service.save_blood_request(request_item)
        if not saved:
            raise HTTPException(status_code=500, detail="Failed to save blood request to database.")

        # Run matching to find top 5 donors
        all_matches = match_service.match_donors(payload.blood_group, lat, lon, payload.urgency)
        top_5 = all_matches[:5]

        # Serialize matched donors for response
        matched_donors = []
        for d in top_5:
            ratio_val = d.get('calls_to_donations_ratio')
            if ratio_val is not None:
                try:
                    ratio_val = float(ratio_val)
                except (ValueError, TypeError):
                    ratio_val = None

            donations_val = d.get('donations_till_date', 0)
            try:
                donations_val = int(donations_val)
            except (ValueError, TypeError):
                donations_val = 0

            matched_donors.append({
                "user_id": d.get("user_id", ""),
                "blood_group": d.get("blood_group", ""),
                "gender": d.get("gender"),
                "donations_till_date": donations_val,
                "donor_type": d.get("donor_type"),
                "calls_to_donations_ratio": ratio_val,
                "distance_km": d.get("distance_km"),
                "is_soft_eligible": d.get("is_soft_eligible", False),
                "days_until_eligible": d.get("days_until_eligible")
            })

        return {
            "success": True,
            "request_id": request_id,
            "message": f"Blood request created. Found {len(matched_donors)} compatible donors.",
            "matched_donors": matched_donors
        }

    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error creating blood request: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
