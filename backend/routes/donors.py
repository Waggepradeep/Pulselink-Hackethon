# backend/routes/donors.py

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, field_validator
from datetime import date
import uuid
import hashlib
import logging
from backend.services.dynamodb_service import DynamoDBService

router = APIRouter()
logger = logging.getLogger(__name__)

# Allowed blood groups list
ALLOWED_BLOOD_GROUPS = {"A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"}

# Dependency Injection for DB Service
def get_db_service():
    return DynamoDBService()

# Pydantic Schema for Registration Request
class DonorRegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    phone: str = Field(..., min_length=5, max_length=20)
    blood_group: str
    gender: str = Field(..., min_length=1)
    city: str = Field(..., min_length=1)
    state: str = Field(..., min_length=1)
    latitude: float
    longitude: float
    language_preference: str = Field(..., min_length=1)
    consent_to_contact: bool

    # Validate blood group
    @field_validator('blood_group')
    @classmethod
    def validate_blood_group(cls, value: str) -> str:
        bg = value.strip().upper()
        # Map verbal formats if passed
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

# Response Schema
class DonorRegisterResponse(BaseModel):
    success: bool
    user_id: str
    message: str

@router.post("/donors/register", response_model=DonorRegisterResponse)
def register_donor_endpoint(
    payload: DonorRegisterRequest,
    db_service: DynamoDBService = Depends(get_db_service)
):
    """
    POST /api/donors/register
    Validates, defaults, and saves a new donor record to the database.
    """
    try:
        # Generate a unique SHA-256 based user_id with the prefix matching existing hashes
        unique_seed = f"{payload.phone}-{payload.name}-{uuid.uuid4()}"
        sha256_hash = hashlib.sha256(unique_seed.encode('utf-8')).hexdigest()
        user_id = r"\x2" + sha256_hash

        # Create record matching the schema
        donor_item = {
            "user_id": user_id,
            "role": "Bridge Donor",
            "name": payload.name,
            "phone": payload.phone,
            "blood_group": payload.blood_group,
            "gender": payload.gender,
            "city": payload.city,
            "state": payload.state,
            "latitude": payload.latitude,
            "longitude": payload.longitude,
            "language_preference": payload.language_preference,
            "consent_to_contact": payload.consent_to_contact,
            "eligibility_status": "eligible",
            "user_donation_active_status": "Active",
            "donations_till_date": 0,
            "calls_to_donations_ratio": 0.0,
            "registration_date": date.today().isoformat()
        }

        # Save to database (DynamoDB or Mock fallback)
        success = db_service.register_donor(donor_item)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to save donor to the database.")

        return {
            "success": True,
            "user_id": user_id,
            "message": "Donor registered successfully."
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error in donor registration endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
