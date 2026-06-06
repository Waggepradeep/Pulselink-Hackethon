# backend/services/matching_service.py

from backend.utils.compatibility import get_compatible_blood_groups
from backend.services.dynamodb_service import DynamoDBService
from datetime import datetime, date
import logging

logger = logging.getLogger(__name__)

# Donor type scoring weights
DONOR_TYPE_SCORES = {
    "Regular Donor": 10,
    "One-Time Donor": 5,
}
DEFAULT_DONOR_TYPE_SCORE = 2

class MatchingService:
    def __init__(self, dynamodb_service: DynamoDBService):
        self.db_service = dynamodb_service

    @staticmethod
    def _safe_int(val, default=0):
        if val is None or val == '':
            return default
        try:
            return int(val)
        except (ValueError, TypeError):
            return default

    @staticmethod
    def _safe_float(val, default=0.0):
        if val is None or val == '':
            return default
        try:
            return float(val)
        except (ValueError, TypeError):
            return default

    @staticmethod
    def _days_since_donation(last_donation_date_str):
        """Calculate days since last donation. More days = more available."""
        if not last_donation_date_str or last_donation_date_str == '':
            return 365  # Assume very available if no record
        try:
            # Try common date formats
            for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%m/%d/%Y", "%d/%m/%Y"):
                try:
                    dt = datetime.strptime(str(last_donation_date_str).strip(), fmt).date()
                    delta = (date.today() - dt).days
                    return max(0, delta)
                except ValueError:
                    continue
            return 365  # If no format matches, assume available
        except Exception:
            return 365

    def match_donors(self, recipient_group: str) -> list[dict]:
        """
        Smart weighted matching:
        1. Find compatible donor blood groups.
        2. Query DynamoDB for active, eligible donors.
        3. Score each donor using weighted formula.
        4. Sort by match_score DESC.
        5. Return top 10 donors with match_score.
        """
        compatible_groups = get_compatible_blood_groups(recipient_group)
        if not compatible_groups:
            logger.warning(f"No compatible groups found for: '{recipient_group}'")
            return []

        logger.info(f"Recipient group '{recipient_group}' compatible with donors: {compatible_groups}")

        candidates = self.db_service.scan_compatible_donors(compatible_groups)

        if not candidates:
            return []

        # Pre-compute max values for normalization
        max_donations = max(
            (self._safe_int(d.get('donations_till_date')) for d in candidates),
            default=1
        ) or 1  # Avoid division by zero

        max_ratio = max(
            (self._safe_float(d.get('calls_to_donations_ratio')) for d in candidates),
            default=1.0
        ) or 1.0

        max_days = max(
            (self._days_since_donation(d.get('last_donation_date')) for d in candidates),
            default=1
        ) or 1

        # Score each donor
        scored = []
        for donor in candidates:
            donations = self._safe_int(donor.get('donations_till_date'))
            ratio = self._safe_float(donor.get('calls_to_donations_ratio'))
            days = self._days_since_donation(donor.get('last_donation_date'))
            donor_type = donor.get('donor_type', 'Other')
            type_score = DONOR_TYPE_SCORES.get(donor_type, DEFAULT_DONOR_TYPE_SCORE)

            # Weighted score calculation (out of 100)
            donation_component = (donations / max_donations) * 40
            ratio_component = (ratio / max_ratio) * 30
            days_component = (days / max_days) * 20
            type_component = (type_score / 10) * 10

            match_score = round(donation_component + ratio_component + days_component + type_component, 1)

            # Attach score to donor dict
            donor_copy = dict(donor)
            donor_copy['match_score'] = match_score
            scored.append(donor_copy)

        # Sort by match_score descending
        scored.sort(key=lambda d: d['match_score'], reverse=True)

        top_10 = scored[:10]

        logger.info(f"Found {len(candidates)} compatible donors, returning top {len(top_10)} with scores")
        return top_10
