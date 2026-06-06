# backend/routes/match.py

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from decimal import Decimal
from backend.services.dynamodb_service import DynamoDBService
from backend.services.matching_service import MatchingService

router = APIRouter()

# Dependency Injection for services
def get_matching_service():
    db_service = DynamoDBService()
    return MatchingService(db_service)

# Pydantic Schemas
class MatchRequest(BaseModel):
    blood_group: str

class DonorResponse(BaseModel):
    user_id: str
    role: str
    blood_group: str
    gender: Optional[str] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    last_donation_date: Optional[str] = None
    next_eligible_date: Optional[str] = None
    donations_till_date: Optional[int] = 0
    eligibility_status: str
    donor_type: str
    user_donation_active_status: str
    calls_to_donations_ratio: Optional[Decimal] = None

    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }

class MatchResponse(BaseModel):
    matches: List[DonorResponse]

@router.post("/match", response_model=MatchResponse)
def match_donors_endpoint(payload: MatchRequest, match_service: MatchingService = Depends(get_matching_service)):
    """
    POST /api/match
    Returns top 10 eligible active donors compatible with the requested blood group,
    sorted by number of donations till date descending.
    """
    try:
        # Validate blood group input
        bg = payload.blood_group.strip().upper()
        valid_groups = {"A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-",
                        "A POSITIVE", "A NEGATIVE", "B POSITIVE", "B NEGATIVE",
                        "AB POSITIVE", "AB NEGATIVE", "O POSITIVE", "O NEGATIVE"}
        if bg not in valid_groups:
            raise HTTPException(status_code=400, detail=f"Invalid blood group requested: '{payload.blood_group}'")

        results = match_service.match_donors(payload.blood_group)
        return {"matches": results}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred while matching donors: {str(e)}")
