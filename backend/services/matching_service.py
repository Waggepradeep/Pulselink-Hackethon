# backend/services/matching_service.py

from backend.utils.compatibility import get_compatible_blood_groups
from backend.services.dynamodb_service import DynamoDBService
import logging

logger = logging.getLogger(__name__)

class MatchingService:
    def __init__(self, dynamodb_service: DynamoDBService):
        self.db_service = dynamodb_service

    def match_donors(self, recipient_group: str) -> list[dict]:
        """
        Main matching logic:
        1. Find compatible donor blood groups.
        2. Query DynamoDB for active, eligible donors of these blood groups.
        3. Sort by donations_till_date DESC.
        4. Return top 10 donors.
        """
        # Find compatible blood groups
        compatible_groups = get_compatible_blood_groups(recipient_group)
        if not compatible_groups:
            logger.warning(f"No compatible groups found for: '{recipient_group}'")
            return []

        logger.info(f"Recipient group '{recipient_group}' compatible with donors: {compatible_groups}")

        # Fetch candidates from DynamoDB
        candidates = self.db_service.scan_compatible_donors(compatible_groups)
        
        # Sort candidates by donations_till_date DESC
        # Note: donations_till_date might be Decimal, None, or string. Convert safely.
        def get_donations_count(donor):
            val = donor.get('donations_till_date')
            if val is None or val == '':
                return 0
            try:
                return int(val)
            except (ValueError, TypeError):
                return 0

        # Sort in-place by donations count descending
        sorted_candidates = sorted(candidates, key=get_donations_count, reverse=True)

        # Slice top 10
        top_10 = sorted_candidates[:10]
        
        logger.info(f"Found {len(candidates)} compatible donors, returning top {len(top_10)}")
        return top_10
