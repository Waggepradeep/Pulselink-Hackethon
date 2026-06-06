# BloodBridge AI 🩸🤖

BloodBridge AI is a production-ready, full-stack donor matching and outreach platform built for the **Blood Warriors Thalassemia Donor Matching Hackathon**. 

It streamlines the workflow for Thalassemia patient coordinators by identifying compatible donors, sorting them by reliability (donation count), and generating culturally appropriate, WhatsApp-ready outreach messages in local languages (Kannada, Tamil, Telugu, Marathi, Hindi, and English) using **AWS Bedrock Claude Haiku**.

---

## 🚀 Key Features

1. **Smart Donor Matching Dashboard**: 
   - Dynamically searches compatible donor groups based on recipient compatibility rules.
   - Filters for active eligible donors (`eligibility_status = "eligible"` and `user_donation_active_status = "Active"`).
   - Renders the top 10 matches, sorted by `donations_till_date` descending.

2. **AI-Powered Regional Outreach Assistant**: 
   - Resolves donor state and language using coordinates (`latitude`/`longitude`).
   - Uses **AWS Bedrock Claude Haiku** to draft polite, respectful, WhatsApp-ready messages.
   - Direct integration for copying message drafts or sharing via WhatsApp API.

3. **Admin Analytics Dashboard**: 
   - Real-time aggregated statistics (Total Donors, Eligible Donors, Eligibility Rate).
   - High-performance Recharts visualization for blood group distributions and donor type breakdowns.

4. **Robust Offline/Mock Mode**:
   - If AWS credentials are not configured, the backend automatically flags and switches to a local CSV database parsing mode (`Dataset.csv`).
   - It also uses local language templates if Bedrock is inaccessible, ensuring the application remains **100% operational** out-of-the-box for evaluators.

---

## 🛠 Tech Stack

- **Frontend**: React.js, Tailwind CSS (v4), Axios, Recharts, Lucide Icons
- **Backend**: Python FastAPI, Boto3 (AWS SDK), Uvicorn, Pydantic, Python-Dotenv
- **AI Model**: AWS Bedrock (`anthropic.claude-haiku-4-5-20251001`)
- **Database**: AWS DynamoDB (`BloodBridge_Donors` table in `us-east-1`)

---

## 📁 Project Structure

```text
Pulselink-Hackethon/
│
├── Dataset.csv                       # Raw donor dataset (CSV format)
├── location_map.json                 # Pre-computed coordinates-to-state mapping
├── load_data.py                      # Data import utility to upload CSV to DynamoDB
├── create_location_map.py            # Script used to generate offline location mapping
│
├── backend/
│   ├── app.py                        # Main FastAPI server entry point
│   ├── .env                          # Backend configurations (region, table, models)
│   ├── requirements.txt              # Backend python packages list
│   │
│   ├── routes/
│   │   ├── match.py                  # POST /api/match endpoint
│   │   ├── outreach.py               # POST /api/outreach endpoint
│   │   └── stats.py                  # GET /api/stats endpoint
│   │
│   ├── services/
│   │   ├── dynamodb_service.py       # AWS DynamoDB client and local CSV fallback wrapper
│   │   ├── bedrock_service.py        # AWS Bedrock Claude Haiku API driver and message fallbacks
│   │   └── matching_service.py       # Core donor-group compatibility search algorithm
│   │
│   └── utils/
│       ├── compatibility.py          # Recipient-to-donor blood compatibility rules
│       ├── location_map.json         # Static copy of coordinate-to-language database
│       └── location_mapper.py        # Offline reverse-geocoding coordinate lookup
│
└── frontend/
    ├── src/
    │   ├── main.jsx                  # React DOM entry point
    │   ├── App.jsx                   # Navigation layout and page router
    │   ├── index.css                 # Tailwind v4 directives and custom glassmorphism styles
    │   │
    │   ├── components/
    │   │   ├── MatchTable.jsx        # Renders matched donors table and action triggers
    │   │   ├── OutreachModal.jsx     # AI outreach generator card, copy and WhatsApp hooks
    │   │   └── StatsCards.jsx        # Admin stats metric indicator cards
    │   │
    │   ├── pages/
    │   │   ├── Dashboard.jsx         # Coordinator search dashboard
    │   │   └── Admin.jsx             # Admin analytics metrics and Recharts pie charts
    │   │
    │   └── services/
    │       └── api.js                # Axios client configurations
    │
    ├── tailwind.config.js            # Tailwind v4 configuration file
    ├── postcss.config.js             # PostCSS Tailwind plugin loader
    ├── package.json                  # Frontend node dependencies
    └── index.html                    # Scaffolding markup, SEO meta tags, and fonts
```

---

## ⚙️ Setup Instructions

### 1. Prerequisites
- **Python**: version 3.10+ (tested on `3.12.6`)
- **Node.js**: version 20+ (tested on `22.12.0`)
- **AWS Credentials (Optional)**: Set up locally using `aws configure` in `us-east-1` for database/Bedrock. If not configured, the app will run in offline mode using `Dataset.csv` and local translation scripts.

---

### 2. Backend Setup
1. Open your terminal in the workspace root directory.
2. Create and activate a Python virtual environment:
   ```powershell
   # Windows PowerShell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```
3. Install backend requirements:
   ```bash
   pip install -r backend/requirements.txt
   ```
4. Verify configurations in `backend/.env`. (Default settings point to model `anthropic.claude-haiku-4-5-20251001` and region `us-east-1`).
5. (Optional) Run the database import tool to write to AWS DynamoDB:
   ```bash
   python load_data.py
   ```
6. Run the FastAPI development server:
   ```bash
   python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload
   ```
   *The backend documentation will be accessible at `http://127.0.0.1:8000/docs`.*

---

### 3. Frontend Setup
1. Open a new terminal window in the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your web browser and navigate to the address displayed in your terminal (typically `http://localhost:5173`).

---

## 💉 Blood Compatibility Rules

This app implements the following compatibility logic:

| Recipient Group | Eligible Donor Groups |
| :--- | :--- |
| **A+** | A+, A-, O+, O- |
| **A-** | A-, O- |
| **B+** | B+, B-, O+, O- |
| **B-** | B-, O- |
| **AB+** | A+, A-, B+, B-, AB+, AB-, O+, O- |
| **AB-** | A-, B-, AB-, O- |
| **O+** | O+, O- |
| **O-** | O- |

---

## 📞 AI Outreach State-to-Language Rules

The coordinates mapping converts the location of the selected donor into their corresponding Indian State, which maps to their native regional language:

- **Karnataka** $\rightarrow$ Kannada
- **Tamil Nadu** $\rightarrow$ Tamil
- **Telangana** $\rightarrow$ Telugu
- **Andhra Pradesh** $\rightarrow$ Telugu
- **Maharashtra** $\rightarrow$ Marathi
- **All other Indian States** $\rightarrow$ Hindi
- **Fallback / Outside India** $\rightarrow$ English
