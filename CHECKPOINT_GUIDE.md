# BloodBridge AI - Project Checkpoint Guide

This guide is designed to help you explain the inner workings of **BloodBridge AI** to your mentor, guide, or senior engineer. It is structured in plain English, focusing on architectural patterns, engineering decisions, and system flows.

---

## 📝 1. Project Summary (3 Sentences)
BloodBridge AI is a full-stack emergency donor matching and outreach platform designed to assist thalassemia coordinators in finding compatible blood donors quickly. The application automates donor compatibility filtering, queries an AWS DynamoDB registry, and ranks candidates by historical donation counts to prioritize reliable donors. Finally, it reverse-geocodes donor coordinates offline to determine regional scripts and uses AWS Bedrock (Claude Haiku) to draft localized, copy-ready WhatsApp messages.

---

## 🗃️ 2. File-by-File Explanation (Plain English)

### Root Workspace Files
* **[CHECKPOINT_GUIDE.md](file:///c:/Users/wagge/OneDrive/Desktop/Pulselink-Hackethon/CHECKPOINT_GUIDE.md)**: This study guide for presentations.
* **[Build.md](file:///c:/Users/wagge/OneDrive/Desktop/Pulselink-Hackethon/Build.md)**: Developer setup, installation guide, and API specifications.
* **[load_data.py](file:///c:/Users/wagge/OneDrive/Desktop/Pulselink-Hackethon/load_data.py)**: The ingestion script. It reads `Dataset.csv`, validates rows, normalizes verbal blood groups, and batch uploads records to AWS DynamoDB.
* **[Dataset.csv](file:///c:/Users/wagge/OneDrive/Desktop/Pulselink-Hackethon/Dataset.csv)**: Raw donor registry containing simulated names, coordinates, blood groups, and eligibility statistics.
* **[location_map.json](file:///c:/Users/wagge/OneDrive/Desktop/Pulselink-Hackethon/location_map.json)**: Static data containing reference coordinates for Indian states and languages.
* **[.env](file:///c:/Users/wagge/OneDrive/Desktop/Pulselink-Hackethon/.env)**: Project configuration housing AWS access keys, regions, and model identifiers.

### Backend - API Routers (`backend/routes/`)
* **[app.py](file:///c:/Users/wagge/OneDrive/Desktop/Pulselink-Hackethon/backend/app.py)**: The FastAPI server entry point. It sets up CORS headers and imports API routers.
* **[match.py](file:///c:/Users/wagge/OneDrive/Desktop/Pulselink-Hackethon/backend/routes/match.py)**: Defines the donor matching API endpoint (`POST /api/match`).
* **[outreach.py](file:///c:/Users/wagge/OneDrive/Desktop/Pulselink-Hackethon/backend/routes/outreach.py)**: Defines the AI outreach message drafting endpoint (`POST /api/outreach`).
* **[stats.py](file:///c:/Users/wagge/OneDrive/Desktop/Pulselink-Hackethon/backend/routes/stats.py)**: Defines the dashboard statistics aggregation endpoint (`GET /api/stats`).

### Backend - Integrations & Services (`backend/services/`)
* **[dynamodb_service.py](file:///c:/Users/wagge/OneDrive/Desktop/Pulselink-Hackethon/backend/services/dynamodb_service.py)**: Coordinates connections to AWS DynamoDB. If credentials or network checks fail, it automatically shifts to offline mode, querying `Dataset.csv` in-memory.
* **[bedrock_service.py](file:///c:/Users/wagge/OneDrive/Desktop/Pulselink-Hackethon/backend/services/bedrock_service.py)**: Communicates with AWS Bedrock to prompt Claude Haiku. It falls back to pre-translated templates if Bedrock is unreachable.
* **[matching_service.py](file:///c:/Users/wagge/OneDrive/Desktop/Pulselink-Hackethon/backend/services/matching_service.py)**: Contains the sorting and selection logic, ranking eligible donors by their total donation counts.

### Backend - Utilities (`backend/utils/`)
* **[compatibility.py](file:///c:/Users/wagge/OneDrive/Desktop/Pulselink-Hackethon/backend/utils/compatibility.py)**: Evaluates donor-recipient blood compatibility matrix (e.g. O- can give to anyone, AB+ can receive from anyone).
* **[location_mapper.py](file:///c:/Users/wagge/OneDrive/Desktop/Pulselink-Hackethon/backend/utils/location_mapper.py)**: Calculates the nearest Indian state and language based on the donor's coordinates using mathematical distance calculations.

### Frontend - React Components & Pages (`frontend/src/`)
* **[App.jsx](file:///c:/Users/wagge/OneDrive/Desktop/Pulselink-Hackethon/frontend/src/App.jsx)**: Main UI container configuring page tabs (Coordinator Dashboard and Admin Analytics).
* **[api.js](file:///c:/Users/wagge/OneDrive/Desktop/Pulselink-Hackethon/frontend/src/services/api.js)**: Axios HTTP client wrapper communicating with the FastAPI backend.
* **[Dashboard.jsx](file:///c:/Users/wagge/OneDrive/Desktop/Pulselink-Hackethon/frontend/src/pages/Dashboard.jsx)**: Main screen for searching, listing matches, and invoking AI outreach templates.
* **[Admin.jsx](file:///c:/Users/wagge/OneDrive/Desktop/Pulselink-Hackethon/frontend/src/pages/Admin.jsx)**: Admin insights screen displaying Recharts graphics (pie charts) of the donor registry.
* **[MatchTable.jsx](file:///c:/Users/wagge/OneDrive/Desktop/Pulselink-Hackethon/frontend/src/components/MatchTable.jsx)**: Renders the donor table with donations count medals and ratio progress bars.
* **[OutreachModal.jsx](file:///c:/Users/wagge/OneDrive/Desktop/Pulselink-Hackethon/frontend/src/components/OutreachModal.jsx)**: Overlay window displaying the generated WhatsApp script with "Copy" and "Open in WhatsApp Web" features.
* **[StatsCards.jsx](file:///c:/Users/wagge/OneDrive/Desktop/Pulselink-Hackethon/frontend/src/components/StatsCards.jsx)**: Summarizes metrics cards (Registered Donors, Eligible Donors, Eligibility Rate) at the top of the Admin page.

---

## 🧮 3. The Matching Algorithm (Step-by-Step)

When a coordinator searches for compatible donors for a specific recipient blood type, the backend processes the request in four steps:

1. **Step 1: Blood Group Compatibility Mapping**:
   The backend retrieves a list of compatible donor blood types. For example, if the recipient is `B+`, the compatible donor list is `["B+", "B-", "O+", "O-"]`.
2. **Step 2: Database Query & Filter Scans**:
   The system queries DynamoDB (or mock database) and filters the registry based on three parameters:
   * The donor's blood group must be in the compatible list.
   * The donor's `user_donation_active_status` must be `"Active"`.
   * The donor's `eligibility_status` must be `"eligible"` (must have surpassed the minimum time gap since their last donation).
3. **Step 3: Reliability Ranking (Donation Sorter)**:
   All compatible, active, and eligible donors are sorted by their `donations_till_date` in **descending order**. This places regular and experienced donors at the top.
4. **Step 4: Result Slicing**:
   The sorted list is sliced to return only the **top 10 donors**, providing the coordinator with an actionable, high-quality list without overwhelming them.

---

## 🤖 4. AWS Bedrock Integration (Claude Haiku)

AWS Bedrock is utilized to generate personalized outreach text dynamically:
* **Model Used**: Claude Haiku via the Cross-Region Inference Profile (`us.anthropic.claude-haiku-4-5-20251001-v1:0`).
* **The Prompt Sent**:
  The system constructs a detailed instruction set containing:
  * Coordinator profile ("You are a coordinator for Blood Warriors...").
  * Donor profile (Reference ID, Gender, Blood Group, resolved Location State, and resolved Language).
  * Requirements: Write the message in the native script of the resolved language; keep the tone warm and urgent; format it for WhatsApp with emojis and bold text; do not include placeholders (like `[Name]`), email headers, or extra conversational preamble.
* **The Response Received**:
  A plain text string containing only the generated WhatsApp message in the native script (e.g., Telugu, Kannada, Tamil, Marathi, or Hindi), immediately ready for copying.

---

## 💾 5. AWS DynamoDB Integration

* **Data Stored**: Individual donor records. Key attributes include:
  * `user_id` (Partition Key - String hash)
  * `blood_group` (Normalized shorthand, e.g. `O+`, `A-`)
  * `latitude` / `longitude` (Decimals)
  * `eligibility_status` (`eligible` / `not eligible`)
  * `user_donation_active_status` (`Active` / `Inactive`)
  * `donations_till_date` (Integer count)
  * `calls_to_donations_ratio` (Decimal representation of outreach response efficiency)
* **Query Patterns**:
  * **Fetch Single Profile**: Direct get-item query using `user_id` ($O(1)$ key lookup).
  * **Matching Scan**: Table scan with filter expressions evaluating blood type compatibility, activity status, and eligibility status.
  * **Stats Aggregation**: Projected scans reading only `blood_group, donor_type, eligibility_status` keys to compute analytics metrics while minimizing billing costs and network payload sizes.

---

## 📍 6. Offline Location-to-Language Mapping

To determine the regional script of the donor without relying on paid, slow external mapping APIs, we developed an offline spatial lookup system:
1. We identified 132 unique geographical coordinates (centroids) mapping to different Indian states.
2. These centroids, along with their mapped languages, are stored in [location_map.json](file:///c:/Users/wagge/OneDrive/Desktop/Pulselink-Hackethon/backend/utils/location_map.json).
3. When matching, the server calculates the Euclidean distance between the donor's coordinates and the reference centroids.
4. The nearest centroid state is selected (e.g. latitude `17.39` and longitude `78.46` maps to Hyderabad, Telangana).
5. The state maps to the primary language:
   * Telangana / Andhra Pradesh $\rightarrow$ Telugu
   * Karnataka $\rightarrow$ Kannada
   * Tamil Nadu $\rightarrow$ Tamil
   * Maharashtra $\rightarrow$ Marathi
   * Others $\rightarrow$ Hindi / English

---

## 🔌 7. API Endpoints (Plain English)

### 1. Donor Matching (`POST /api/match`)
* **What goes in**: A JSON payload containing the recipient's blood group (e.g. `{"blood_group": "A+"}`).
* **What comes out**: An array containing the top 10 compatible, active, and eligible donors sorted by total donations count descending.

### 2. AI Outreach Message (`POST /api/outreach`)
* **What goes in**: The unique `user_id` of the matched donor (e.g. `{"user_id": "\\x206c..."}`).
* **What comes out**: The resolved regional language name and the drafted message text (in native script) generated by Claude Haiku or fallback templates.

### 3. Dashboard Statistics (`GET /api/stats`)
* **What goes in**: Nothing (simple GET request).
* **What comes out**: An aggregate summary of the entire database, including total counts, eligible counts, blood group distribution counts, and donor type breakdowns.

---

## 💬 8. Top 5 Mentor Questions & Sample Answers

#### Q1: "Why scan the database rather than query by Global Secondary Indexes (GSIs)?"
* **Answer**: In a production environment, blood group compatibility lists (`["A+", "A-", "O+", "O-"]`) contain multiple values. DynamoDB does not support querying an `IN` operator on GSIs. Therefore, we utilize a scan operation with a structured filter expression. To optimize cost, we project only the necessary attributes and cap matching outputs.

#### Q2: "How did you resolve the model identifier error with Bedrock?"
* **Answer**: AWS Bedrock does not support invoking the base model `anthropic.claude-haiku-4-5-20251001-v1:0` directly with on-demand throughput. To fix this, we wrapped the call using the cross-region inference profile identifier: `us.anthropic.claude-haiku-4-5-20251001-v1:0`, which routes requests dynamically and successfully completes on-demand calls.

#### Q3: "What is your fallback strategy if the LLM fails or is throttled?"
* **Answer**: We implemented a robust fallback hierarchy. If the Bedrock service client throws a validation error or network timeout, the application catches the exception and immediately falls back to localized templates stored in native scripts (Telugu, Kannada, Tamil, Marathi, and Hindi). The user is served a working message without any interruption.

#### Q4: "Why prioritize donations history count over closest distance?"
* **Answer**: Thalassemia coordinators need reliable, responsive donors. Regular donors (indicated by high historical donation counts) are statistically much more likely to respond and visit the hospital during an emergency compared to a donor who is physically close but has never donated or is unresponsive. Sorting by donation counts optimizes coordinator conversion rates.

#### Q5: "How does the frontend communicate with the backend? How is CORS handled?"
* **Answer**: The frontend uses Axios to communicate with the FastAPI server running on port 8000. In `backend/app.py`, we configured CORSMiddleware to allow all methods (`*`), headers (`*`), and origins (`*`) to facilitate local integration testing.

---

## ⚙️ 9. Project Evaluation (Status, Fallbacks, and Improvements)

### What Works
* Data import script validating and uploading 4,962 records to AWS DynamoDB.
* Blood compatibility engine with standard verbal matching.
* Live AWS Bedrock Claude Haiku message generator resolving to 5 native Indian language scripts.
* Interactive Admin dashboard charts using React Recharts.
* Dynamically scaled, color-coded Calls-to-Donations ratio progress bars illustrating outreach response efficiency.

### Fallback Mechanics
* **Database fallback**: Automatically reads `Dataset.csv` in-memory if AWS credentials are not configured.
* **AI fallback**: Automatically falls back to localized template scripts if Bedrock is unreachable.

### Potential Improvements (Future Scope)
* **Real-time SMS/WhatsApp API Integration**: Connect the "Open in WhatsApp" action to Twilio or the WhatsApp Business API to allow bulk coordinator messaging.
* **Geographical Distance Sort**: Integrate actual haversine distance calculations relative to the hospital coordinates to allow coordinators to filter by distance radius (e.g., within 10km of the clinic).
* **Cognito Authentication**: Add AWS Cognito to authenticate coordinators and restrict access to the Admin Insights page.
