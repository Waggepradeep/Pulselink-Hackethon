# backend/test_new_features.py
import unittest
from unittest.mock import MagicMock
from decimal import Decimal
from datetime import datetime
import uuid

from backend.services.dynamodb_service import DynamoDBService
from backend.services.matching_service import MatchingService
from backend.routes.outreach import update_outreach_response_endpoint, OutreachResponseUpdateRequest
from backend.routes.requests import (
    create_blood_request,
    escalate_request_endpoint,
    BloodRequestCreate,
    EscalateRequestPayload
)

class TestNewFeatures(unittest.TestCase):
    def setUp(self):
        # Initialize the DynamoDB service in mock mode to avoid AWS dependencies
        self.db_service = DynamoDBService()
        self.db_service.use_mock = True
        self.db_service.mock_requests = []
        self.db_service.mock_data = [
            {
                "user_id": "donor_1",
                "blood_group": "O-",
                "latitude": Decimal("17.3850"),
                "longitude": Decimal("78.4867"),
                "user_donation_active_status": "Active",
                "eligibility_status": "eligible",
                "donations_till_date": 5,
                "calls_to_donations_ratio": Decimal("0.2")
            },
            {
                "user_id": "donor_2",
                "blood_group": "O-",
                "latitude": Decimal("17.3890"),
                "longitude": Decimal("78.4890"),
                "user_donation_active_status": "Active",
                "eligibility_status": "eligible",
                "donations_till_date": 2,
                "calls_to_donations_ratio": Decimal("0.5")
            },
            {
                "user_id": "donor_3",
                "blood_group": "O-",
                "latitude": Decimal("17.3810"),
                "longitude": Decimal("78.4810"),
                "user_donation_active_status": "Active",
                "eligibility_status": "eligible",
                "donations_till_date": 3,
                "calls_to_donations_ratio": Decimal("0.1")
            },
            {
                "user_id": "donor_4",
                "blood_group": "O-",
                "latitude": Decimal("17.3820"),
                "longitude": Decimal("78.4820"),
                "user_donation_active_status": "Active",
                "eligibility_status": "eligible",
                "donations_till_date": 1,
                "calls_to_donations_ratio": Decimal("0.4")
            },
            {
                "user_id": "donor_5",
                "blood_group": "O-",
                "latitude": Decimal("17.3830"),
                "longitude": Decimal("78.4830"),
                "user_donation_active_status": "Active",
                "eligibility_status": "eligible",
                "donations_till_date": 0,
                "calls_to_donations_ratio": Decimal("0.0")
            },
            {
                "user_id": "donor_6",
                "blood_group": "O-",
                "latitude": Decimal("17.3840"),
                "longitude": Decimal("78.4840"),
                "user_donation_active_status": "Active",
                "eligibility_status": "eligible",
                "donations_till_date": 10,
                "calls_to_donations_ratio": Decimal("0.8")
            }
        ]
        self.match_service = MatchingService(self.db_service)

    def test_create_blood_request_and_matching(self):
        # 1. Test Blood Request Creation endpoint
        payload = BloodRequestCreate(
            patient_name="Test Patient",
            blood_group="O-",
            urgency="Routine",
            hospital_name="Test Hospital",
            hospital_city="Hyderabad",
            hospital_state="Telangana",
            contact_phone="1234567890",
            units_required=2,
            latitude=17.3850,
            longitude=78.4867
        )
        
        response = create_blood_request(payload, db_service=self.db_service, match_service=self.match_service)
        
        self.assertTrue(response["success"])
        self.assertIsNotNone(response["request_id"])
        self.assertEqual(len(response["matched_donors"]), 5) # Matches max 5 initially
        
        # Verify saved request in mock database
        saved_req = self.db_service.get_blood_request(response["request_id"])
        self.assertIsNotNone(saved_req)
        self.assertEqual(saved_req["patient_name"], "Test Patient")
        self.assertEqual(saved_req["status"], "open")

    def test_donor_response_tracking(self):
        # 2. Test Donor Response Tracking
        request_id = str(uuid.uuid4())
        request_item = {
            "request_id": request_id,
            "patient_name": "Response Patient",
            "blood_group": "O-",
            "urgency": "Routine",
            "hospital_name": "Test Hospital",
            "hospital_city": "Hyderabad",
            "status": "open",
            "donor_responses": {}
        }
        self.db_service.save_blood_request(request_item)

        # Track first response as no_response
        payload1 = OutreachResponseUpdateRequest(
            request_id=request_id,
            donor_id="donor_1",
            response="no_response"
        )
        res1 = update_outreach_response_endpoint(payload1, db_service=self.db_service)
        self.assertTrue(res1["success"])
        
        # Verify database has updated response
        updated_req = self.db_service.get_blood_request(request_id)
        self.assertEqual(updated_req["donor_responses"]["donor_1"], "no_response")
        self.assertEqual(updated_req["status"], "open") # Status remains open

        # Track second response as accepted
        payload2 = OutreachResponseUpdateRequest(
            request_id=request_id,
            donor_id="donor_2",
            response="accepted"
        )
        res2 = update_outreach_response_endpoint(payload2, db_service=self.db_service)
        self.assertTrue(res2["success"])
        
        # Verify status is updated to fulfilled
        updated_req = self.db_service.get_blood_request(request_id)
        self.assertEqual(updated_req["donor_responses"]["donor_2"], "accepted")
        self.assertEqual(updated_req["status"], "fulfilled")

    def test_escalation_logic(self):
        # 3. Test Escalation Logic
        request_id = str(uuid.uuid4())
        request_item = {
            "request_id": request_id,
            "patient_name": "Escalation Patient",
            "blood_group": "O-",
            "urgency": "Routine",
            "hospital_name": "Test Hospital",
            "hospital_city": "Hyderabad",
            "latitude": Decimal("17.3850"),
            "longitude": Decimal("78.4867"),
            "status": "open",
            "donor_responses": {
                "donor_1": "no_response",
                "donor_2": "no_response",
                "donor_3": "no_response"
            },
            "escalation_history": []
        }
        self.db_service.save_blood_request(request_item)

        # Trigger escalation
        payload = EscalateRequestPayload(request_id=request_id)
        res = escalate_request_endpoint(payload, db_service=self.db_service, match_service=self.match_service)
        
        self.assertTrue(res["success"])
        self.assertIn("escalated successfully", res["message"])
        
        # Next matches should exclude donor_1, donor_2, donor_3
        matched_ids = [d["user_id"] for d in res["matched_donors"]]
        for contacted in ["donor_1", "donor_2", "donor_3"]:
            self.assertNotIn(contacted, matched_ids)

        # Verify DB status is escalated and escalation history contains the event
        updated_req = self.db_service.get_blood_request(request_id)
        self.assertEqual(updated_req["status"], "escalated")
        self.assertEqual(len(updated_req["escalation_history"]), 1)
        
        event = updated_req["escalation_history"][0]
        self.assertEqual(event["escalation_level"], 1)
        self.assertEqual(event["no_response_count"], 3)
        self.assertEqual(event["contacted_count"], 3)

if __name__ == "__main__":
    unittest.main()
