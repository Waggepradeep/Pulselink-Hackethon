# backend/services/dynamodb_service.py

from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv(override=True)

import boto3
from botocore.exceptions import ClientError, NoCredentialsError, PartialCredentialsError
import logging
import csv
import os
from decimal import Decimal

logger = logging.getLogger(__name__)

# Blood group mapping to standardize the CSV verbal groups to shorthand
BLOOD_GROUP_MAP = {
    "A Positive": "A+", "A1 Positive": "A+", "A2 Positive": "A+",
    "A Negative": "A-", "A2 Negative": "A-",
    "B Positive": "B+", "B Negative": "B-",
    "AB Positive": "AB+", "A1B Positive": "AB+", "A2B Positive": "AB+",
    "AB Negative": "AB-", "A2B Negative": "AB-",
    "O Positive": "O+", "O Negative": "O-"
}

class DynamoDBService:
    def __init__(self, region_name="us-east-1", table_name="BloodBridge_Donors"):
        self.region_name = region_name
        self.table_name = table_name
        self.use_mock = False
        self.mock_data = []
        self.table = None

        try:
            self.dynamodb = boto3.resource('dynamodb', region_name=self.region_name)
            # Try to load the table metadata to verify connection and credentials
            table = self.dynamodb.Table(self.table_name)
            table.load()
            self.table = table
            logger.info("Successfully connected to AWS DynamoDB.")
        except (NoCredentialsError, PartialCredentialsError, ClientError, Exception) as e:
            logger.warning(f"AWS credentials not found or DynamoDB table unavailable ({e}). Falling back to local offline mock database.")
            self.use_mock = True
            self._load_local_mock_data()

    def _load_local_mock_data(self):
        """Loads and normalizes data directly from Dataset.csv for offline mode."""
        # Find Dataset.csv in the workspace (check current and parent directories)
        csv_paths = ["Dataset.csv", "../Dataset.csv", "../../Dataset.csv"]
        csv_path = None
        for path in csv_paths:
            if os.path.exists(path):
                csv_path = path
                break
                
        if not csv_path:
            logger.error("Dataset.csv could not be found for offline fallback.")
            return

        try:
            with open(csv_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for r in reader:
                    user_id = r.get('user_id')
                    role = r.get('role')
                    raw_bg = r.get('blood_group')
                    lat_str = r.get('latitude')
                    lon_str = r.get('longitude')
                    
                    # Basic validation like in load_data.py
                    blood_group = BLOOD_GROUP_MAP.get(raw_bg)
                    if not user_id or not role or not blood_group or not lat_str or not lon_str:
                        continue
                        
                    try:
                        lat = float(lat_str)
                        lon = float(lon_str)
                        ratio = float(r.get('calls_to_donations_ratio', 0) or 0)
                    except ValueError:
                        continue

                    # Create record matching the DynamoDB schema
                    item = {
                        "user_id": user_id,
                        "role": role,
                        "blood_group": blood_group,
                        "gender": r.get('gender') or None,
                        "latitude": Decimal(str(lat)),
                        "longitude": Decimal(str(lon)),
                        "last_donation_date": r.get('last_donation_date') or None,
                        "next_eligible_date": r.get('next_eligible_date') or None,
                        "donations_till_date": int(float(r.get('donations_till_date', 0) or 0)),
                        "eligibility_status": r.get('eligibility_status') or "not eligible",
                        "donor_type": r.get('donor_type') or "Other",
                        "user_donation_active_status": r.get('user_donation_active_status') or "Inactive",
                        "calls_to_donations_ratio": Decimal(str(ratio))
                    }
                    # Filter out None values
                    item = {k: v for k, v in item.items() if v is not None}
                    self.mock_data.append(item)
            logger.info(f"Loaded {len(self.mock_data)} records from local CSV into memory.")
        except Exception as e:
            logger.error(f"Error loading offline fallback dataset: {e}")

    def get_table(self):
        """Returns the DynamoDB table resource, creating it if it doesn't exist."""
        if self.use_mock:
            return None
        if self.table:
            return self.table
        try:
            table = self.dynamodb.Table(self.table_name)
            table.load()
            self.table = table
            return self.table
        except ClientError as e:
            if e.response['Error']['Code'] == 'ResourceNotFoundException':
                return self.create_table()
            else:
                raise e

    def create_table(self):
        """Creates the DynamoDB table with user_id as partition key."""
        if self.use_mock:
            logger.info("Mock mode active: skipping AWS table creation.")
            return None
        try:
            table = self.dynamodb.create_table(
                TableName=self.table_name,
                KeySchema=[{'AttributeName': 'user_id', 'KeyType': 'HASH'}],
                AttributeDefinitions=[{'AttributeName': 'user_id', 'AttributeType': 'S'}],
                ProvisionedThroughput={'ReadCapacityUnits': 10, 'WriteCapacityUnits': 25}
            )
            table.wait_until_exists()
            self.table = table
            return self.table
        except Exception as e:
            logger.error(f"Error creating table: {e}")
            raise e

    def get_donor(self, user_id: str) -> dict:
        """Retrieves a single donor record by user_id."""
        if self.use_mock:
            # Find in memory
            for item in self.mock_data:
                if item.get('user_id') == user_id:
                    return item
            return None
            
        table = self.get_table()
        try:
            response = table.get_item(Key={'user_id': user_id})
            return response.get('Item')
        except ClientError as e:
            logger.error(f"Error fetching donor {user_id}: {e}")
            return None

    def scan_compatible_donors(self, blood_groups: list[str]) -> list[dict]:
        """Scans for active, eligible donors who have compatible blood groups."""
        if not blood_groups:
            return []

        if self.use_mock:
            # Filter in memory
            bg_set = set(blood_groups)
            filtered = [
                item for item in self.mock_data
                if item.get('eligibility_status') == 'eligible'
                and item.get('user_donation_active_status') == 'Active'
                and item.get('blood_group') in bg_set
            ]
            return filtered

        table = self.get_table()
        filter_expression = (
            "eligibility_status = :eligible AND "
            "user_donation_active_status = :active AND "
            "blood_group IN (" + ", ".join(f":bg{i}" for i in range(len(blood_groups))) + ")"
        )
        
        expression_values = {
            ":eligible": "eligible",
            ":active": "Active"
        }
        for i, bg in enumerate(blood_groups):
            expression_values[f":bg{i}"] = bg

        donors = []
        try:
            response = table.scan(
                FilterExpression=filter_expression,
                ExpressionAttributeValues=expression_values
            )
            donors.extend(response.get('Items', []))
            while 'LastEvaluatedKey' in response:
                response = table.scan(
                    FilterExpression=filter_expression,
                    ExpressionAttributeValues=expression_values,
                    ExclusiveStartKey=response['LastEvaluatedKey']
                )
                donors.extend(response.get('Items', []))
            return donors
        except ClientError as e:
            logger.error(f"Error scanning compatible donors: {e}")
            return []

    def get_stats_data(self) -> list[dict]:
        """Retrieves projected fields for compiling stats dashboard."""
        if self.use_mock:
            # Return only projected keys
            return [
                {
                    "blood_group": item.get("blood_group"),
                    "donor_type": item.get("donor_type"),
                    "eligibility_status": item.get("eligibility_status")
                }
                for item in self.mock_data
            ]

        table = self.get_table()
        projection = "blood_group, donor_type, eligibility_status"
        items = []
        try:
            response = table.scan(ProjectionExpression=projection)
            items.extend(response.get('Items', []))
            while 'LastEvaluatedKey' in response:
                response = table.scan(
                    ProjectionExpression=projection,
                    ExclusiveStartKey=response['LastEvaluatedKey']
                )
                items.extend(response.get('Items', []))
            return items
        except ClientError as e:
            logger.error(f"Error scanning stats data: {e}")
            return []

    def register_donor(self, donor_item: dict) -> bool:
        """Saves a new donor to DynamoDB or appends to local mock list."""
        # Convert float types to Decimal for DynamoDB insertion compatibility
        from decimal import Decimal
        db_item = {}
        for k, v in donor_item.items():
            if isinstance(v, float):
                db_item[k] = Decimal(str(v))
            else:
                db_item[k] = v

        if self.use_mock:
            self.mock_data.append(db_item)
            logger.info(f"Mock Mode: Registered new donor {db_item.get('user_id')}")
            return True
        try:
            table = self.get_table()
            table.put_item(Item=db_item)
            logger.info(f"DynamoDB Mode: Registered new donor {db_item.get('user_id')}")
            return True
        except Exception as e:
            logger.error(f"Error putting donor item: {e}")
            return False

    def save_blood_request(self, request_item: dict) -> bool:
        """Saves a blood request to the BloodBridge_Requests DynamoDB table."""
        from decimal import Decimal
        db_item = {}
        for k, v in request_item.items():
            if isinstance(v, float):
                db_item[k] = Decimal(str(v))
            elif isinstance(v, int) and not isinstance(v, bool):
                db_item[k] = v
            else:
                db_item[k] = v

        if self.use_mock:
            # In mock mode, just log and return success
            logger.info(f"Mock Mode: Saved blood request {db_item.get('request_id')}")
            return True
        try:
            # Use a separate table for blood requests
            requests_table = self.dynamodb.Table("BloodBridge_Requests")
            try:
                requests_table.load()
            except Exception:
                # Table doesn't exist — create it
                logger.info("BloodBridge_Requests table not found, creating...")
                requests_table = self.dynamodb.create_table(
                    TableName="BloodBridge_Requests",
                    KeySchema=[{'AttributeName': 'request_id', 'KeyType': 'HASH'}],
                    AttributeDefinitions=[{'AttributeName': 'request_id', 'AttributeType': 'S'}],
                    ProvisionedThroughput={'ReadCapacityUnits': 5, 'WriteCapacityUnits': 5}
                )
                requests_table.wait_until_exists()
                logger.info("BloodBridge_Requests table created successfully.")

            requests_table.put_item(Item=db_item)
            logger.info(f"DynamoDB Mode: Saved blood request {db_item.get('request_id')}")
            return True
        except Exception as e:
            logger.error(f"Error saving blood request: {e}")
            return False

    def pause_donor(self, user_id: str, reason: str = "") -> bool:
        """Updates a donor's active status to 'Paused' in DynamoDB."""
        if self.use_mock:
            for item in self.mock_data:
                if item.get('user_id') == user_id:
                    item['user_donation_active_status'] = 'Paused'
                    if reason:
                        item['pause_reason'] = reason
                    logger.info(f"Mock Mode: Paused donor {user_id}")
                    return True
            return False
        try:
            table = self.get_table()
            update_expr = "SET user_donation_active_status = :status"
            expr_values = {":status": "Paused"}
            if reason:
                update_expr += ", pause_reason = :reason"
                expr_values[":reason"] = reason

            table.update_item(
                Key={'user_id': user_id},
                UpdateExpression=update_expr,
                ExpressionAttributeValues=expr_values
            )
            logger.info(f"DynamoDB Mode: Paused donor {user_id}")
            return True
        except Exception as e:
            logger.error(f"Error pausing donor {user_id}: {e}")
            return False
