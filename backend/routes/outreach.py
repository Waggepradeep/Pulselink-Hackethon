# backend/routes/outreach.py

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from backend.services.dynamodb_service import DynamoDBService
from backend.services.bedrock_service import BedrockService
from backend.utils.location_mapper import resolve_location
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# Dependency injections
def get_db_service():
    return DynamoDBService()

def get_bedrock_service():
    return BedrockService()

# Pydantic Schemas
class OutreachRequest(BaseModel):
    user_id: str

class OutreachResponse(BaseModel):
    language: str
    message: str

@router.post("/outreach", response_model=OutreachResponse)
def generate_outreach_endpoint(
    payload: OutreachRequest,
    db_service: DynamoDBService = Depends(get_db_service),
    bedrock_service: BedrockService = Depends(get_bedrock_service)
):
    """
    POST /api/outreach
    Generates a WhatsApp-ready, warm, respectful outreach message tailored to the
    donor's geographic language (Kannada, Tamil, Telugu, Marathi, Hindi, English).
    """
    try:
        # 1. Fetch donor from DynamoDB
        donor = db_service.get_donor(payload.user_id)
        if not donor:
            raise HTTPException(status_code=404, detail=f"Donor with ID '{payload.user_id}' not found.")
            
        # 2. Extract latitude/longitude to determine location (State and Language)
        lat = donor.get('latitude')
        lon = donor.get('longitude')
        
        state = "Unknown"
        language = "English"  # Default fallback
        
        if lat is not None and lon is not None:
            state, language = resolve_location(lat, lon)
            
        # 3. Prompt Bedrock (Claude Haiku) to generate message
        message = bedrock_service.generate_outreach_message(donor, state, language)
        
        return {
            "language": language,
            "message": message
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred while generating outreach message: {str(e)}")


# --- Smart Bulk Outreach (grouped by language) ---

class BulkOutreachRequest(BaseModel):
    user_ids: list[str]

class BulkOutreachGroupItem(BaseModel):
    language: str
    message: str
    donor_ids: list[str]

class BulkOutreachResponse(BaseModel):
    results: list[BulkOutreachGroupItem]

@router.post("/outreach/bulk", response_model=BulkOutreachResponse)
def generate_bulk_outreach_endpoint(
    payload: BulkOutreachRequest,
    db_service: DynamoDBService = Depends(get_db_service),
    bedrock_service: BedrockService = Depends(get_bedrock_service)
):
    """
    POST /api/outreach/bulk
    Groups donors by detected language, generates ONE bilingual message per group,
    and returns [{language, message, donor_ids}].
    """
    # Step 1: Resolve language for each donor and group them
    language_groups = {}  # { language: { "donor_ids": [...], "sample_donor": {...}, "state": "..." } }

    for uid in payload.user_ids:
        try:
            donor = db_service.get_donor(uid)
            if not donor:
                continue

            lat = donor.get('latitude')
            lon = donor.get('longitude')
            state = "Unknown"
            language = "English"
            if lat is not None and lon is not None:
                state, language = resolve_location(lat, lon)

            if language not in language_groups:
                language_groups[language] = {
                    "donor_ids": [],
                    "sample_donor": donor,
                    "state": state
                }
            language_groups[language]["donor_ids"].append(uid)
        except Exception as e:
            logger.warning(f"Error resolving donor {uid}: {e}")
            continue

    # Step 2: Generate ONE message per language group using the sample donor
    results = []
    for language, group_data in language_groups.items():
        try:
            message = bedrock_service.generate_outreach_message(
                group_data["sample_donor"],
                group_data["state"],
                language
            )
            results.append({
                "language": language,
                "message": message,
                "donor_ids": group_data["donor_ids"]
            })
        except Exception as e:
            logger.error(f"Error generating message for language {language}: {e}")
            results.append({
                "language": language,
                "message": f"Failed to generate message: {str(e)}",
                "donor_ids": group_data["donor_ids"]
            })

    return {"results": results}
