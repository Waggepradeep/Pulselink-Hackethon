# backend/utils/location_mapper.py

import os
import json
import math

MAP_FILE = os.path.join(os.path.dirname(__file__), "location_map.json")
_location_map = {}

# Try to load the pre-computed location mapping
if os.path.exists(MAP_FILE):
    try:
        with open(MAP_FILE, 'r', encoding='utf-8') as f:
            _location_map = json.load(f)
    except Exception as e:
        print(f"Warning: Failed to load location_map.json: {e}")

# Bounding boxes for key states (fallback if coordinate not pre-mapped)
STATE_BOUNDING_BOXES = {
    "Karnataka": {"lat": (11.5, 18.5), "lon": (74.0, 78.6), "lang": "Kannada"},
    "Tamil Nadu": {"lat": (8.0, 13.5), "lon": (76.0, 80.5), "lang": "Tamil"},
    "Telangana": {"lat": (15.8, 19.9), "lon": (77.2, 81.3), "lang": "Telugu"},
    "Andhra Pradesh": {"lat": (12.6, 19.1), "lon": (76.7, 84.8), "lang": "Telugu"},
    "Maharashtra": {"lat": (15.6, 22.0), "lon": (72.6, 80.9), "lang": "Marathi"},
}

# Approximate centroids of target states
STATE_CENTROIDS = {
    "Telangana": (17.3850, 78.4867),
    "Karnataka": (12.9716, 77.5946),
    "Tamil Nadu": (13.0827, 80.2707),
    "Andhra Pradesh": (16.5062, 80.6480),
    "Maharashtra": (19.7515, 75.7139),
}

def distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates simple Euclidean distance for classification purposes."""
    return math.sqrt((lat1 - lat2) ** 2 + (lon1 - lon2) ** 2)

def resolve_location(lat: float, lon: float) -> tuple[str, str]:
    """
    Given latitude and longitude, returns (State, Language).
    Uses pre-computed location map if possible, and falls back to bounding box / centroid-distance heuristic.
    """
    try:
        lat = float(lat)
        lon = float(lon)
    except (ValueError, TypeError):
        return "Unknown", "English"

    # 1. Exact string match from pre-computed mapping
    key = f"{lat},{lon}"
    if key in _location_map:
        data = _location_map[key]
        return data["matched_state"], data["language"]
        
    # 2. Approximate floating-point match (to handle small precision differences)
    for k, data in _location_map.items():
        try:
            klat, klon = map(float, k.split(','))
            if abs(lat - klat) < 0.0001 and abs(lon - klon) < 0.0001:
                return data["matched_state"], data["language"]
        except Exception:
            continue

    # 3. Bounding box fallback
    matched_states = []
    for state, info in STATE_BOUNDING_BOXES.items():
        lat_min, lat_max = info["lat"]
        lon_min, lon_max = info["lon"]
        if lat_min <= lat <= lat_max and lon_min <= lon <= lon_max:
            matched_states.append(state)
            
    if len(matched_states) == 1:
        state = matched_states[0]
        return state, STATE_BOUNDING_BOXES[state]["lang"]
    elif len(matched_states) > 1:
        # Overlapping bounding boxes: resolve using closest centroid
        closest_state = min(matched_states, key=lambda s: distance(lat, lon, *STATE_CENTROIDS[s]))
        return closest_state, STATE_BOUNDING_BOXES[closest_state]["lang"]
        
    # 4. Centroid-based classification fallback for points in India
    if 8.0 <= lat <= 36.0 and 68.0 <= lon <= 97.0:
        # Find closest state centroid
        closest_state = min(STATE_CENTROIDS.keys(), key=lambda s: distance(lat, lon, *STATE_CENTROIDS[s]))
        # Ensure it is within a reasonable distance (e.g. 5 degrees)
        if distance(lat, lon, *STATE_CENTROIDS[closest_state]) < 5.0:
            return closest_state, STATE_BOUNDING_BOXES[closest_state]["lang"]
        else:
            return "Other State", "Hindi"
            
    # Outside India / fallback
    return "Unknown", "English"
