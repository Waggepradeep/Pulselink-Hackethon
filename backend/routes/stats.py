# backend/routes/stats.py

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict
from collections import Counter
from backend.services.dynamodb_service import DynamoDBService

router = APIRouter()

# Dependency injection
def get_db_service():
    return DynamoDBService()

# Pydantic Schema
class StatsResponse(BaseModel):
    total_donors: int
    eligible_donors: int
    blood_group_distribution: Dict[str, int]
    donor_type_breakdown: Dict[str, int]

@router.get("/stats", response_model=StatsResponse)
def get_dashboard_stats_endpoint(db_service: DynamoDBService = Depends(get_db_service)):
    """
    GET /api/stats
    Aggregates statistics for the Admin Dashboard.
    Calculates total registered, total eligible, and distributions of blood groups and donor types.
    """
    try:
        # Fetch minimal projected fields from DynamoDB
        items = db_service.get_stats_data()
        
        total_donors = len(items)
        eligible_donors = 0
        
        blood_group_counts = Counter()
        donor_type_counts = Counter()
        
        for item in items:
            # Check eligibility status
            elig = item.get('eligibility_status')
            if elig == 'eligible':
                eligible_donors += 1
                
            # Count blood groups (standardize name or skip empty)
            bg = item.get('blood_group')
            if bg:
                blood_group_counts[bg] += 1
            else:
                blood_group_counts['Unknown'] += 1
                
            # Count donor types
            dtype = item.get('donor_type')
            if dtype:
                donor_type_counts[dtype] += 1
            else:
                donor_type_counts['Other'] += 1
                
        return {
            "total_donors": total_donors,
            "eligible_donors": eligible_donors,
            "blood_group_distribution": dict(blood_group_counts),
            "donor_type_breakdown": dict(donor_type_counts)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred while fetching dashboard stats: {str(e)}")
