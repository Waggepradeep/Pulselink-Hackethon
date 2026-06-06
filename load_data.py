# load_data.py

from dotenv import load_dotenv
load_dotenv(override=True)

import csv
import logging
import sys
from decimal import Decimal
import os

# Adjust path to import from backend
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from backend.services.dynamodb_service import DynamoDBService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("import.log", encoding="utf-8")
    ]
)
logger = logging.getLogger("load_data")

BLOOD_GROUP_MAP = {
    "A Positive": "A+",
    "A1 Positive": "A+",
    "A2 Positive": "A+",
    "A Negative": "A-",
    "A2 Negative": "A-",
    "B Positive": "B+",
    "B Negative": "B-",
    "AB Positive": "AB+",
    "A1B Positive": "AB+",
    "A2B Positive": "AB+",
    "AB Negative": "AB-",
    "A2B Negative": "AB-",
    "O Positive": "O+",
    "O Negative": "O-"
}

def clean_decimal(val):
    """Safely converts a value to Decimal for DynamoDB insertion."""
    if val is None or val == '':
        return None
    try:
        # Convert float through string to avoid precision artifacts
        return Decimal(str(val).strip())
    except (ValueError, TypeError):
        return None

def clean_int(val):
    """Safely converts a value to int."""
    if val is None or val == '':
        return 0
    try:
        return int(float(val))  # handle cases like "5.0"
    except (ValueError, TypeError):
        return 0

def load_data(csv_path="Dataset.csv"):
    if not os.path.exists(csv_path):
        logger.error(f"CSV file not found at: {csv_path}")
        return

    logger.info("Initializing DynamoDB service...")
    db_service = DynamoDBService()
    try:
        table = db_service.get_table()
    except Exception as e:
        logger.error(f"Failed to connect to DynamoDB: {e}")
        return

    logger.info(f"Connected to DynamoDB Table: {table.name}")
    logger.info("Reading dataset from CSV...")
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    total_rows = len(rows)
    logger.info(f"Loaded {total_rows} rows from CSV. Starting validation & import...")

    success_count = 0
    failed_count = 0
    
    # Open error log
    with open("import_errors.log", "w", encoding="utf-8") as err_log:
        err_log.write("row_num,user_id,error_reason\n")
        
        # Batch writer automatically batches items into groups of 25
        with table.batch_writer() as batch:
            for idx, r in enumerate(rows):
                row_num = idx + 2  # 1-indexed + header
                user_id = r.get('user_id')
                role = r.get('role')
                raw_bg = r.get('blood_group')
                lat_str = r.get('latitude')
                lon_str = r.get('longitude')

                # Validation rules
                reasons = []
                if not user_id:
                    reasons.append("Missing user_id")
                if not role:
                    reasons.append("Missing role")
                    
                # Normalize blood group
                blood_group = BLOOD_GROUP_MAP.get(raw_bg)
                if not raw_bg:
                    reasons.append("Missing blood group")
                elif not blood_group:
                    reasons.append(f"Invalid/unsupported blood group: '{raw_bg}'")

                # Parse coordinates
                latitude = clean_decimal(lat_str)
                longitude = clean_decimal(lon_str)
                if lat_str is None or lon_str is None:
                    reasons.append("Missing coordinates")
                elif latitude is None or longitude is None:
                    reasons.append(f"Invalid coordinates format: lat={lat_str}, lon={lon_str}")

                if reasons:
                    # Validation failed, record and skip
                    failed_count += 1
                    err_msg = "; ".join(reasons)
                    err_log.write(f"{row_num},{user_id or 'unknown'},{err_msg}\n")
                    continue

                # Build record
                item = {
                    "user_id": user_id,
                    "role": role,
                    "blood_group": blood_group,
                    "gender": r.get('gender') or None,
                    "latitude": latitude,
                    "longitude": longitude,
                    "last_donation_date": r.get('last_donation_date') or None,
                    "next_eligible_date": r.get('next_eligible_date') or None,
                    "donations_till_date": clean_int(r.get('donations_till_date')),
                    "eligibility_status": r.get('eligibility_status') or "not eligible",
                    "donor_type": r.get('donor_type') or "Other",
                    "user_donation_active_status": r.get('user_donation_active_status') or "Inactive",
                    "calls_to_donations_ratio": clean_decimal(r.get('calls_to_donations_ratio')),
                    "last_contacted_date": r.get('last_contacted_date') or None,
                    "frequency_in_days": clean_int(r.get('frequency_in_days'))
                }
                
                # Filter out None values to keep DynamoDB items clean
                item = {k: v for k, v in item.items() if v is not None}

                try:
                    # Batch writer handles buffering and flushing automatically
                    batch.put_item(Item=item)
                    success_count += 1
                except Exception as e:
                    failed_count += 1
                    err_log.write(f"{row_num},{user_id},Database insertion error: {str(e)}\n")

                # Progress printing
                if (idx + 1) % 500 == 0 or (idx + 1) == total_rows:
                    percent = int(((idx + 1) / total_rows) * 100)
                    logger.info(f"Processed {idx + 1}/{total_rows} ({percent}%) - Loaded: {success_count}, Failed: {failed_count}")

    logger.info("Data import completed.")
    logger.info(f"Successfully loaded: {success_count} records")
    logger.info(f"Failed/Skipped: {failed_count} records")
    if failed_count > 0:
        logger.warning("Some records failed validation. See import_errors.log for details.")

if __name__ == '__main__':
    load_data()
