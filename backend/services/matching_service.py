# backend/services/matching_service.py

from backend.utils.compatibility import get_compatible_blood_groups
from backend.services.dynamodb_service import DynamoDBService
from datetime import datetime, date
import logging
import math

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

    @staticmethod
    def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate the great-circle distance between two points on the Earth
        (specified in decimal degrees) in kilometers.
        """
        try:
            R = 6371.0  # Radius of Earth in kilometers
            d_lat = math.radians(lat2 - lat1)
            d_lon = math.radians(lon2 - lon1)
            a = (math.sin(d_lat / 2.0) ** 2 +
                 math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2.0) ** 2)
            c = 2.0 * math.asin(math.sqrt(a))
            return R * c
        except Exception as e:
            logger.error(f"Error computing haversine distance: {e}")
            return 0.0

    def match_donors(self, recipient_group: str, recipient_lat: float = None, recipient_lon: float = None) -> list[dict]:
        """
        Smart weighted matching:
        1. Find compatible donor blood groups.
        2. Query DynamoDB for active, eligible donors.
        3. Compute distance if coordinates are provided.
        4. Score each donor using weighted formula (optionally incorporating proximity).
        5. Sort by match_score DESC.
        6. Return top 10 donors.
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

        # Check if we should perform proximity-based scoring
        has_coords = (recipient_lat is not None) and (recipient_lon is not None)
        distances = {}
        if has_coords:
            try:
                r_lat = float(recipient_lat)
                r_lon = float(recipient_lon)
                for donor in candidates:
                    d_lat = self._safe_float(donor.get('latitude'))
                    d_lon = self._safe_float(donor.get('longitude'))
                    # Haversine distance
                    dist = self.haversine_distance(r_lat, r_lon, d_lat, d_lon)
                    distances[donor['user_id']] = dist
            except Exception as e:
                logger.error(f"Error preparing coordinates: {e}")
                has_coords = False

        # Score each donor
        scored = []
        for donor in candidates:
            uid = donor.get('user_id')
            donations = self._safe_int(donor.get('donations_till_date'))
            ratio = self._safe_float(donor.get('calls_to_donations_ratio'))
            days = self._days_since_donation(donor.get('last_donation_date'))
            donor_type = donor.get('donor_type', 'Other')
            type_score = DONOR_TYPE_SCORES.get(donor_type, DEFAULT_DONOR_TYPE_SCORE)

            dist_km = distances.get(uid) if has_coords else None

            if has_coords and dist_km is not None:
                # Proximity Score component: 30% weight
                # Capped at 200 km. Closer donor = higher score
                MAX_RADIUS_KM = 200.0
                proximity_component = max(0.0, 1.0 - (dist_km / MAX_RADIUS_KM)) * 30.0

                # Adjusted weights (Total = 100%)
                donation_component = (donations / max_donations) * 30.0
                ratio_component = (ratio / max_ratio) * 20.0
                days_component = (days / max_days) * 10.0
                type_component = (type_score / 10.0) * 10.0

                match_score = round(proximity_component + donation_component + ratio_component + days_component + type_component, 1)
            else:
                # Fallback to original weights (Total = 100%)
                donation_component = (donations / max_donations) * 40.0
                ratio_component = (ratio / max_ratio) * 30.0
                days_component = (days / max_days) * 20.0
                type_component = (type_score / 10.0) * 10.0

                match_score = round(donation_component + ratio_component + days_component + type_component, 1)

            # Attach score and optional distance to donor details
            donor_copy = dict(donor)
            donor_copy['match_score'] = match_score
            donor_copy['distance_km'] = round(dist_km, 1) if dist_km is not None else None
            scored.append(donor_copy)

        # Sort by match_score descending
        scored.sort(key=lambda d: d['match_score'], reverse=True)

        top_10 = scored[:10]

        logger.info(f"Found {len(candidates)} compatible donors, returning top {len(top_10)} with scores")
        return top_10

