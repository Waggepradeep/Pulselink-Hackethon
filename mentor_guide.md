# Mentor & Guide Presentation Prep: BloodBridge AI

This guide is structured to help you present **BloodBridge AI** to your mentors or project guides. It covers the high-level pitch, architectural details, matching algorithm code walkthrough, and responses to potential questions.

---

## 🌟 1. The High-Level Pitch (The Elevator Pitch)
> *"BloodBridge AI is a specialized donor-recipient matching and outreach application designed for thalassemia support coordinators. Thalassemia patients require regular blood transfusions, meaning coordinators face the daily challenge of finding eligible, compatible donors, translating messages into regional languages, and managing outreach. Our platform automates donor compatibility filtering, sorts candidates by donation history, reverse-geocodes coordinates offline to determine regional scripts, and leverages AWS Bedrock (Claude Haiku) to draft localized, copy-ready WhatsApp messages."*

---

## 🧠 2. Detailed Walkthrough: The Matching Algorithm

If your mentor asks, **"Walk me through your matching algorithm code,"** here is the exact step-by-step breakdown:

### Step A: Compatibility Mapping (`compatibility.py`)
* **File Location**: [compatibility.py](file:///c:/Users/wagge/OneDrive/Desktop/Pulselink-Hackethon/backend/utils/compatibility.py)
* **What it does**: Maps standard blood compatibility rules. For instance, an **A+** recipient can receive blood from **A+, A-, O+, and O-** donors.
* **How it handles inputs**: Standardizes case and verbal formats (e.g. converting `"A Positive"` or `"a positive"` to `"A+"`).
* **Key Code**:
  ```python
  COMPATIBILITY_RULES = {
      "A+": ["A+", "A-", "O+", "O-"],
      "A-": ["A-", "O-"],
      "B+": ["B+", "B-", "O+", "O-"],
      ...
  }
  ```

### Step B: Database Querying (`dynamodb_service.py`)
* **File Location**: [dynamodb_service.py](file:///c:/Users/wagge/OneDrive/Desktop/Pulselink-Hackethon/backend/services/dynamodb_service.py)
* **What it does**: Queries the database to fetch compatible donors.
* **Filtering Logic**: To protect patient safety and coordinator time, we apply strict filter criteria *at the database level* (using DynamoDB Filter Expressions):
  1. **Eligibility Status**: The donor's `eligibility_status` must be exactly `"eligible"` (must have surpassed their next eligible donation date).
  2. **Active Status**: The donor's `user_donation_active_status` must be `"Active"`.
  3. **Blood Group**: The donor's blood group must belong to the compatible blood groups list computed in Step A.
* **Key Code**:
  ```python
  filter_expression = (
      "eligibility_status = :eligible AND "
      "user_donation_active_status = :active AND "
      "blood_group IN (" + ", ".join(f":bg{i}" for i in range(len(blood_groups))) + ")"
  )
  ```

### Step C: Ranking & Sorting (`matching_service.py`)
* **File Location**: [matching_service.py](file:///c:/Users/wagge/OneDrive/Desktop/Pulselink-Hackethon/backend/services/matching_service.py)
* **What it does**: Compiles results, ranks them, and slices the output.
* **Sorting Logic**: We sort the compatible, active, eligible donors by `donations_till_date` in **descending order**. This prioritizes experienced, regular donors who are highly likely to respond and donate.
* **Slicing**: We return the **top 10 matches** to avoid coordinator overwhelm, keeping the dashboard actionable and fast.
* **Key Code**:
  ```python
  def get_donations_count(donor):
      val = donor.get('donations_till_date')
      # Safe parsing to handle Decimal or string formats
      try:
          return int(val) if val else 0
      except (ValueError, TypeError):
          return 0

  sorted_candidates = sorted(candidates, key=get_donations_count, reverse=True)
  top_10 = sorted_candidates[:10]
  ```

---

## ⚡ 3. Explaining the AWS Integrations

### How is AWS DynamoDB Used?
* **NoSQL Model**: We use a single-table partition key design (`user_id` as partition key) which allows fast, single-key fetches ($O(1)$) when opening a donor's profile.
* **Batch Operations**: The [load_data.py](file:///c:/Users/wagge/OneDrive/Desktop/Pulselink-Hackethon/load_data.py) script leverages `batch_writer()` to write records in chunks of 25, maximizing throughput and saving write capacity units.
* **Projected Scans**: For the admin insights metrics, we run a projected scan only retrieving `"blood_group, donor_type, eligibility_status"`, which saves network bandwidth and CPU cycles.

### How is AWS Bedrock Used?
* **Model Selection**: We use **Claude Haiku** via its cross-region inference profile (`us.anthropic.claude-haiku-4-5-20251001-v1:0`). This model is chosen because it is fast, cost-efficient, and supports excellent regional Indian language output.
* **Prompt Engineering**: The prompt specifies donor reference details, recipient urgency, regional language script instructions, and strict format rules (WhatsApp-ready, short, conversational, and no JSON wrappers or header headers).

---

## 📍 4. Explaining Offline Location Mapping

If they ask, **"How does the regional language detection work? Are you calling Google Maps API?"**
* **Answer**: *"No, calling a live geocoding API for thousands of donors would introduce network latency, API costs, and dependency on external internet services. Instead, we built an **Offline Location Mapper**."*
* **How it works**:
  1. We pre-analyzed the coordinates of the 7,000+ donors and mapped 132 unique coordinate pairs into a local database [location_map.json](file:///c:/Users/wagge/OneDrive/Desktop/Pulselink-Hackethon/backend/utils/location_map.json).
  2. The mapper [location_mapper.py](file:///c:/Users/wagge/OneDrive/Desktop/Pulselink-Hackethon/backend/utils/location_mapper.py) calculates the Euclidean distance between the donor's coordinates and the reference centroids.
  3. It associates the donor to the nearest Indian State (e.g. Telangana, Tamil Nadu, Maharashtra).
  4. It maps the state to the region's primary language (e.g., Telangana/Andhra Pradesh $\rightarrow$ Telugu, Karnataka $\rightarrow$ Kannada, Tamil Nadu $\rightarrow$ Tamil, Maharashtra $\rightarrow$ Marathi, Others $\rightarrow$ Hindi, Default $\rightarrow$ English).
  5. The resolved language is then sent to Bedrock (or falls back to a local script template) to format the script in native character sets (Telugu script, Devanagari script, etc.).

---

## 🛡️ 5. Resiliency & Fallback Strategy

A great question from a mentor is, **"What happens if AWS is down, or credentials fail during a demonstration?"**
* **Answer**: *"We designed the system with high resilience using **automatic local fallbacks** for both database and AI layers:"*
  * **Database Fallback**: If Boto3 fails to initialize or connect to AWS DynamoDB, `DynamoDBService` catches the exception and flips `self.use_mock = True`. It then parses `Dataset.csv` locally, loads records into memory, and performs the exact same matching and stats aggregations. The frontend remains 100% functional.
  * **Outreach Fallback**: If AWS Bedrock runtime throws a credentials/validation error or is unreachable, the backend catches the `ClientError` and fetches a local, pre-translated message template in the target language's native script. The coordinator still gets a WhatsApp-ready message instantly.

---

## 💬 6. Expected Questions & Sample Answers

#### Q: Why did you sort by donation history instead of distance?
* **A**: Thalassemia patients need transfusions regularly, and coordinators prioritize *donor reliability*. Donors who have donated frequently in the past (high `donations_till_date`) are far more likely to respond quickly to emergency outreach compared to a closer donor who has never donated before or is hard to reach. Combining compatibility, active eligibility, and donation count yields the highest outreach conversion.

#### Q: How did you implement styling?
* **A**: We built a custom dark theme using vanilla CSS configurations integrated natively into **Tailwind CSS v4**'s `@theme` directive. The branding uses a dark blood-red and deep navy palette, custom tooltips for Recharts, glassmorphism card overlays, and clean progress bars indicating the donor's calls-to-donation ratio.

#### Q: Why FastAPI instead of Django or Flask?
* **A**: FastAPI is built on ASGI, which makes it natively asynchronous. This allows it to handle concurrent API requests (like donor matching, stats generation, and Bedrock calls) with very high performance and minimal memory footprint, making it ideal for scalable serverless web applications.
