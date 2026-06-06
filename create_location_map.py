import csv
import json
import time
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut

def get_unique_coordinates(csv_path):
    coords = set()
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for r in reader:
            lat = r.get('latitude')
            lon = r.get('longitude')
            if lat and lon:
                try:
                    coords.add((float(lat), float(lon)))
                except ValueError:
                    pass
    return sorted(list(coords))

def main():
    csv_path = 'Dataset.csv'
    coords = get_unique_coordinates(csv_path)
    print(f"Found {len(coords)} unique coordinate pairs. Geocoding...")
    
    geolocator = Nominatim(user_agent="bloodbridge_warriors_hackathon_app")
    
    location_map = {}
    
    # Language mapping based on State
    state_to_lang = {
        "karnataka": "Kannada",
        "tamil nadu": "Tamil",
        "telangana": "Telugu",
        "andhra pradesh": "Telugu",
        "maharashtra": "Marathi"
    }
    
    count = 0
    for lat, lon in coords:
        count += 1
        key = f"{lat},{lon}"
        
        # Try to geocode with retries
        state = None
        for attempt in range(3):
            try:
                # Add delay to respect Nominatim usage policy (1 request per second)
                time.sleep(1.0)
                location = geolocator.reverse((lat, lon), timeout=5, language='en')
                if location and 'address' in location.raw:
                    address = location.raw['address']
                    state = address.get('state')
                break
            except (GeocoderTimedOut, Exception) as e:
                print(f"Attempt {attempt+1} failed for {lat},{lon}: {e}")
                time.sleep(2.0)
        
        if state:
            state_lower = state.lower()
            lang = "Hindi"  # Default for other Indian states
            
            # Match state
            matched_state = state
            for key_state, value_lang in state_to_lang.items():
                if key_state in state_lower:
                    lang = value_lang
                    matched_state = key_state.title()
                    break
                    
            location_map[key] = {
                "state": state,
                "matched_state": matched_state,
                "language": lang
            }
            print(f"[{count}/{len(coords)}] {lat},{lon} -> {state} ({lang})")
        else:
            # Fallback
            location_map[key] = {
                "state": "Unknown",
                "matched_state": "Unknown",
                "language": "Hindi"
            }
            print(f"[{count}/{len(coords)}] {lat},{lon} -> Geocoding failed (Fallback to Hindi)")
            
    # Save mapping to JSON
    out_path = 'location_map.json'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(location_map, f, indent=2)
        
    print(f"Saved {len(location_map)} location mappings to {out_path}")

if __name__ == '__main__':
    main()
