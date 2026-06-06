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
    def _days_since_contacted(contacted_date_str) -> int:
        """Calculate days since last contacted. Smaller delta = contacted recently."""
        if not contacted_date_str or contacted_date_str == '':
            return 999  # Assume not contacted recently
        try:
            for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%m/%d/%Y", "%d/%m/%Y"):
                try:
                    dt = datetime.strptime(str(contacted_date_str).strip(), fmt).date()
                    delta = (date.today() - dt).days
                    return max(0, delta)
                except ValueError:
                    continue
            return 999
        except Exception:
            return 999

    @staticmethod
    def _days_until_eligible(next_eligible_date_str) -> int:
        """Calculate days until donor becomes eligible again."""
        if not next_eligible_date_str or next_eligible_date_str == '':
            return 999
        try:
            for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%m/%d/%Y", "%d/%m/%Y"):
                try:
                    dt = datetime.strptime(str(next_eligible_date_str).strip(), fmt).date()
                    delta = (dt - date.today()).days
                    return delta
                except ValueError:
                    continue
            return 999
        except Exception:
            return 999

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

    def match_donors(self, recipient_group: str, recipient_lat: float = None, recipient_lon: float = None, urgency: str = None) -> list[dict]:
        """
        Smart weighted matching with dynamic prioritization features:
        1. Find compatible donor blood groups.
        2. Query DynamoDB for active, eligible (or soft-eligible) donors.
        3. Score each donor using weighted formula (optionally incorporating proximity).
        4. Apply donor fatigue penalty (-15 points if contacted < 7 days ago).
        5. Apply soft eligibility penalty (-20 points for Routine requests soon-to-be-eligible).
        6. Apply optimal loyalty window boost (+10 points if in sweet spot).
        7. Return top 10 donors.
        """
        compatible_groups = get_compatible_blood_groups(recipient_group)
        if not compatible_groups:
            logger.warning(f"No compatible groups found for: '{recipient_group}'")
            return []

        logger.info(f"Recipient group '{recipient_group}' compatible with donors: {compatible_groups}")

        candidates = self.db_service.scan_compatible_donors(compatible_groups)

        if not candidates:
            return []

        # Filter candidates based on eligibility status and urgency rules
        urgency_clean = (urgency or "Critical").strip().capitalize()
        valid_candidates = []

        for donor in candidates:
            status = donor.get('eligibility_status', 'not eligible')
            
            if status == 'eligible':
                valid_candidates.append((donor, False, 0))  # (donor, is_soft_eligible, days_until_eligible)
            elif urgency_clean == 'Routine':
                # Soft eligibility for Routine requests: next_eligible_date within 14 days
                next_eligible = donor.get('next_eligible_date')
                days_until = self._days_until_eligible(next_eligible)
                if 0 < days_until <= 14:
                    valid_candidates.append((donor, True, days_until))

        if not valid_candidates:
            return []

        # Extract list of dictionaries for compatibility with previous logic
        candidate_dicts = [item[0] for item in valid_candidates]

        # Pre-compute max values for normalization
        max_donations = max(
            (self._safe_int(d.get('donations_till_date')) for d in candidate_dicts),
            default=1
        ) or 1

        max_ratio = max(
            (self._safe_float(d.get('calls_to_donations_ratio')) for d in candidate_dicts),
            default=1.0
        ) or 1.0

        max_days = max(
            (self._days_since_donation(d.get('last_donation_date')) for d in candidate_dicts),
            default=1
        ) or 1

        # Check if we should perform proximity-based scoring
        has_coords = (recipient_lat is not None) and (recipient_lon is not None)
        distances = {}
        if has_coords:
            try:
                r_lat = float(recipient_lat)
                r_lon = float(recipient_lon)
                for donor in candidate_dicts:
                    d_lat = self._safe_float(donor.get('latitude'))
                    d_lon = self._safe_float(donor.get('longitude'))
                    dist = self.haversine_distance(r_lat, r_lon, d_lat, d_lon)
                    distances[donor['user_id']] = dist
            except Exception as e:
                logger.error(f"Error preparing coordinates: {e}")
                has_coords = False

        # Score each donor
        scored = []
        for donor, is_soft_eligible, days_until in valid_candidates:
            uid = donor.get('user_id')
            donations = self._safe_int(donor.get('donations_till_date'))
            ratio = self._safe_float(donor.get('calls_to_donations_ratio'))
            days = self._days_since_donation(donor.get('last_donation_date'))
            donor_type = donor.get('donor_type', 'Other')
            type_score = DONOR_TYPE_SCORES.get(donor_type, DEFAULT_DONOR_TYPE_SCORE)

            dist_km = distances.get(uid) if has_coords else None

            if has_coords and dist_km is not None:
                # Proximity Score component: 30% weight
                MAX_RADIUS_KM = 200.0
                proximity_component = max(0.0, 1.0 - (dist_km / MAX_RADIUS_KM)) * 30.0

                # Adjusted weights (Total = 100%)
                donation_component = (donations / max_donations) * 30.0
                ratio_component = (ratio / max_ratio) * 20.0
                days_component = (days / max_days) * 10.0
                type_component = (type_score / 10.0) * 10.0

                base_score = proximity_component + donation_component + ratio_component + days_component + type_component
            else:
                # Fallback to original weights (Total = 100%)
                donation_component = (donations / max_donations) * 40.0
                ratio_component = (ratio / max_ratio) * 30.0
                days_component = (days / max_days) * 20.0
                type_component = (type_score / 10.0) * 10.0

                base_score = donation_component + ratio_component + days_component + type_component

            # Apply Upgrades
            
            # 1. Donor Fatigue Downranking (contacted < 7 days ago -> -15 points)
            fatigue_penalty = 0.0
            last_contacted = donor.get('last_contacted_date')
            days_since_contact = self._days_since_contacted(last_contacted)
            if days_since_contact < 7:
                fatigue_penalty = -15.0

            # 2. Soft Eligibility Penalty (-20 points)
            eligibility_penalty = -20.0 if is_soft_eligible else 0.0

            # 4. Loyalty Window Boost (+10 points if inside average donation frequency cycle)
            loyalty_boost = 0.0
            freq_days = self._safe_int(donor.get('frequency_in_days'))
            if freq_days > 0:
                if freq_days - 7 <= days <= freq_days + 14:
                    loyalty_boost = 10.0

            final_score = base_score + fatigue_penalty + eligibility_penalty + loyalty_boost
            match_score = round(max(0.0, min(100.0, final_score)), 1)

            # Attach details to donor dictionary
            donor_copy = dict(donor)
            donor_copy['match_score'] = match_score
            donor_copy['distance_km'] = round(dist_km, 1) if dist_km is not None else None
            donor_copy['is_soft_eligible'] = is_soft_eligible
            donor_copy['days_until_eligible'] = days_until if is_soft_eligible else None
            donor_copy['fatigue_applied'] = (days_since_contact < 7)
            donor_copy['loyalty_boost_applied'] = (freq_days > 0 and freq_days - 7 <= days <= freq_days + 14)
            scored.append(donor_copy)

        # Sort by match_score descending
        scored.sort(key=lambda d: d['match_score'], reverse=True)

        top_10 = scored[:10]

        logger.info(f"Found {len(candidates)} compatible donors, returning top {len(top_10)} with scores")
        return top_10

