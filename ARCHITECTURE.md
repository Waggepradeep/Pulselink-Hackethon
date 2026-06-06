# BloodBridge AI - System Architecture Document

This document outlines the detailed system architecture, logical layers, data flow patterns, and design patterns implemented in the **BloodBridge AI** application.

![System Architecture Diagram](system_architecture_diagram.png)

---

## 🏗️ 1. High-Level Architectural Flow

BloodBridge AI is built on a modular full-stack architecture, utilizing React on the frontend, FastAPI on the backend, and AWS cloud resources for scalable storage and AI inference.

```mermaid
graph TD
    User([Thalassemia Coordinator]) -->|Interacts with UI| Frontend[React + Tailwind CSS v4 Frontend]
    
    subgraph Frontend Client App (Vite Dev Server)
        Frontend -->|Axios HTTP Requests| API_Client[api.js Client]
    end

    API_Client -->|REST API calls over HTTP| Backend[FastAPI Server]

    subgraph FastAPI Backend App (Uvicorn Server)
        Backend -->|Route Matching| Match_Route[/api/match]
        Backend -->|Route Outreach| Outreach_Route[/api/outreach]
        Backend -->|Route Stats| Stats_Route[/api/stats]

        Match_Route --> Matching_Service[MatchingService]
        Outreach_Route --> Bedrock_Service[BedrockService]
        Stats_Route --> Stats_Service[DynamoDBService]

        Matching_Service --> Compatibility_Util[compatibility.py Matrix]
        Matching_Service --> Stats_Service
        
        Bedrock_Service --> Location_Mapper[location_mapper.py Offline Geocoder]
        Location_Mapper --> Location_Map[(location_map.json State Boundaries)]
    end

    subgraph AWS Cloud Resources (us-east-1)
        Stats_Service -->|Scan/Get Query| DynamoDB_Table[(AWS DynamoDB Table: BloodBridge_Donors)]
        Bedrock_Service -->|InvokeModel API| Bedrock_Claude[(AWS Bedrock: Claude Haiku 4.5)]
    end

    subgraph Resilient Offline Fallbacks (Local System)
        Stats_Service -.->|Mock Database Fallback| CSV_Mock[(In-Memory CSV Reader: Dataset.csv)]
        Bedrock_Service -.->|Mock Outreach Fallback| Local_Templates[Native Language Templates]
    end
```

---

## 🎨 2. Logical Layer Breakdown

### A. Presentation Layer (Vite + React.js + Tailwind CSS v4)
* **Branding & Visuals**: Premium dark-mode interface utilizing HSL tailored red gradients and navy blue overlays, maintaining high visual hierarchy and responsive grid layouts.
* **Views**:
  * **Coordinator Dashboard**: Interactive interface allowing coordinators to select a recipient blood group, search compatible matches, view metrics, copy messages, and open WhatsApp Web.
  * **Admin Insights**: Real-time analytics view compiling total registration numbers, eligibility rates, and rendering distributions via modular SVG charts using **Recharts**.
* **API Client (`api.js`)**: Configured with an Axios instance pointing to the backend host (default: `http://localhost:8000`), encapsulating matching, outreach, and metrics endpoints.

### B. Application Server Layer (FastAPI + Uvicorn)
* **Asynchronous Design**: Built on FastAPI's ASGI implementation to process multiple API requests concurrently with minimal memory usage.
* **Endpoints**:
  * `POST /api/match`: Takes recipient blood type, returns compatible donors.
  * `POST /api/outreach`: Takes donor ID, returns language and custom WhatsApp text.
  * `GET /api/stats`: Returns database aggregations for charts.
* **Services Layer**:
  * **Matching Service**: Translates blood group compatibility matrices (`compatibility.py`) and queries database records.
  * **Bedrock Service**: Initializes the Boto3 Bedrock Runtime client and executes inference prompts.
  * **DynamoDB Service**: Coordinates database connections and performs projected attribute scans.

### C. Storage & Database Layer (AWS DynamoDB)
* **NoSQL Model**: Relies on a single-partition key design (`user_id` as String partition key) supporting rapid, $O(1)$ key-value lookups when reading single donor records.
* **Batch Importer**: The `load_data.py` script validates inputs and leverages the DynamoDB `batch_writer()` to upload records in chunks of 25 to optimize write capacities.
* **Projected Scans**: Queries only read specific projected attributes (`blood_group, donor_type, eligibility_status`) when fetching analytics statistics to optimize performance and reduce AWS read unit costs.

### D. Geolocation & Spatial Layer
* **Offline Centroid Mapper**: Employs `location_mapper.py` to calculate Euclidean distances between donor coordinates and Indian state reference centroids.
* **State Mapping**: Determines the closest Indian State boundary and maps it to the region's native language and script:
  * Telangana / Andhra Pradesh $\rightarrow$ Telugu script
  * Karnataka $\rightarrow$ Kannada script
  * Tamil Nadu $\rightarrow$ Tamil script
  * Maharashtra $\rightarrow$ Marathi script
  * Others $\rightarrow$ Hindi / English script

---

## 🔄 3. Core Data Flow Pipelines

### A. Donor Matching Pipeline
```mermaid
sequenceDiagram
    autonumber
    actor Coordinator as Thalassemia Coordinator
    participant FE as React Frontend
    participant BE as FastAPI Backend
    participant Match as MatchingService
    participant DB as AWS DynamoDB
    
    Coordinator->>FE: Select Blood Group & Click "Search Donors"
    FE->>BE: POST /api/match {"blood_group": "B+"}
    BE->>Match: match_donors("B+")
    Note over Match: Resolves compatibility rules:<br/>B+ receives from B+, B-, O+, O-
    Match->>DB: Scan BloodBridge_Donors where<br/>blood_group IN [B+, B-, O+, O-]<br/>and active == 'Active'<br/>and eligible == 'eligible'
    DB-->>Match: Return compatible, active, eligible donors list
    Note over Match: Sorts list in-place by donations_till_date DESC
    Note over Match: Slices list to top 10 elements
    Match-->>BE: Return top 10 reliable matches
    BE-->>FE: Return JSON list of matches
    FE-->>Coordinator: Renders MatchTable UI with donor cards
```

### B. AI Outreach Pipeline
```mermaid
sequenceDiagram
    autonumber
    actor Coordinator as Thalassemia Coordinator
    participant FE as React Frontend
    participant BE as FastAPI Backend
    participant Bedrock as BedrockService
    participant Geocoder as LocationMapper
    participant LLM as AWS Bedrock (Claude)
    
    Coordinator->>FE: Click "AI Outreach" on Donor Row
    FE->>BE: POST /api/outreach {"user_id": "x206c..."}
    BE->>BE: Fetch donor profile coordinates
    BE->>Geocoder: resolve_location(lat, lon)
    Geocoder-->>BE: Return State (Telangana) & Language (Telugu)
    BE->>Bedrock: generate_outreach_message(donor, State, Language)
    
    alt Bedrock is active
        Bedrock->>LLM: InvokeModel (us.anthropic.claude-haiku-4-5-20251001-v1:0)
        LLM-->>Bedrock: Return dynamic message in Telugu script
    else Bedrock fails (Validation / ClientError)
        Note over Bedrock: Catch Exception
        Bedrock->>Bedrock: Fetch pre-translated Telugu template
    end
    
    Bedrock-->>BE: Return outreach script text
    BE-->>FE: Return JSON {"language": "Telugu", "message": "..."}
    FE-->>Coordinator: Opens modal showing message draft
    Coordinator->>FE: Click "Open in WhatsApp"
    Note over FE: Launches whatsapp://send?phone=...&text=...
```

---

## 🛡️ 4. Key Design Considerations

### 1. High Offline Resiliency (Mock Mode)
To ensure the application remains 100% operational during offline demonstrations, hackathon evaluations, or instances where AWS credentials are missing, we built a layered fallback design:
* **Database Fallback**: If connection to AWS DynamoDB fails during startup, the `DynamoDBService` catches the exception and toggles `self.use_mock = True`. It parses `Dataset.csv` locally, loads records into memory, and performs all filters and statistics calculations in-memory.
* **AI Fallback**: If AWS Bedrock runtime throws a ValidationException or ClientError, the backend catches the error and pulls pre-translated, script-accurate templates for the resolved language, serving the coordinator without a service crash.

### 2. Cost and Performance Optimization
* **AWS Bedrock Inference Profile**: Standard on-demand invocations are not supported on the base model ID `anthropic.claude-haiku-4-5-20251001-v1:0`. To run on-demand calls, the service routes requests via the cross-region inference profile `us.anthropic.claude-haiku-4-5-20251001-v1:0`, which optimizes latency and cost.
* **DynamoDB Projection**: Using projected scans prevents fetching unnecessary large attributes like latitude/longitude or donation ratios during admin dashboard renders, which minimizes AWS read capacity unit (RCU) consumption.
