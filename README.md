# Veridian ESG Management Platform

Veridian ESG is a comprehensive enterprise platform designed for organizations to **measure, manage, and optimize** their Environmental, Social, and Governance (ESG) performance. By combining automated carbon accounting, community-driven social initiatives, auditable compliance workflows, and a gamification engine, Veridian ESG integrates sustainability directly into day-to-day operations.

The platform is designed to scale from a focused initial core deployment to a multi-facility, cross-company supply chain carbon marketplace without architectural rewrite.

---

## 1. System Architecture & Tech Stack

The platform is built on a high-performance, modern technology stack selected for security, scalability, and developer velocity.

### Backend Services
* **Framework:** Python 3.11+ / FastAPI for rapid, asynchronous, and type-safe REST API development.
* **Database:** MongoDB 7.0+ configured as a single-node replica set to support ACID transactions for critical actions (such as reward redemption and credit checkouts).
* **Authentication:** Custom JWT-based session management featuring secure password hashing (Argon2id/Bcrypt), email One-Time Passwords (OTP), and long-lived refresh tokens.
* **Email Broker:** SMTP mail gateway support for verification codes, compliance reminders, and system notifications.
* **Storage Layer:** High-level storage abstraction supporting local file storage for development, with a seamless cloud migration path to Backblaze B2 (S3-compatible) for production.

### Frontend Interface
* **Framework:** React with a responsive, modern component framework optimized for desktop, tablet, and mobile views.

---

## 2. Core Modules

### Environmental (Carbon Accounting)
* **Automated Ledgers:** Generates verified carbon transactions from operational records (purchases, manufacturing logs, travel logs, and fleet expenses) via configurable emission factor coefficients.
* **Goal Tracking:** Establish targets, visualize baseline comparisons, and monitor progress toward reducing Scope 1, 2, and 3 emissions.
* **Granular Visualization:** Break down footprint statistics by departments, regions, or activity classification.

### Social (Engagement & Diversity)
* **CSR Workflow:** Manage Corporate Social Responsibility initiatives with an approval pipeline (registration → proof upload → review → reward allocation).
* **Diversity Tracking:** Maintain auditable, self-reported demographic breakdowns by department.
* **Professional Development:** Document employee compliance training modules and completion records.

### Governance (Compliance & Audits)
* **Policy Management:** Publish versioned corporate policies with mandatory user-acknowledgement tracking.
* **Compliance Registry:** Assign and monitor compliance issues resulting from internal audits.
* **Auditing Logs:** Track scheduling, documentation, and findings of internal and external ESG certifications.

### Gamification & Community
* **Interactive Challenges:** Drive workplace environmental goals using structured employee challenges.
* **Double-Counter Economy:** Separate reputation markers (non-spendable lifetime XP) from spendable currency (points used to redeem eco-friendly rewards).
* **Automated Recognition:** Earn badges dynamically when target milestones are reached.
* **Leaderboards:** Rank departments and individual contributors to promote collaborative sustainability efforts.

---

## 3. Directory Layout

The repository is organized into distinct logical scopes:

```text
├── backend/                       # FastAPI application code & service layer
├── frontend/                      # React frontend application
├── documentation/                 # Technical documentation & architecture specs
│   └── database_documentation/
│       └── mongodb_schema.md      # Detailed MongoDB schema & index configuration
├── .gitignore                     # Repository version control filter rules
├── .env.example                   # Global configuration template
└── README.md                      # Project documentation overview
```

---

## 4. Getting Started

### Prerequisites
* **Python** 3.11 or higher
* **Node.js** 20.0 or higher
* **MongoDB** 7.0+ running with replica sets enabled. To start MongoDB with replica sets locally:
  ```bash
  mongod --replSet rs0
  ```
  Then initialize the replica set:
  ```bash
  mongosh --eval "rs.initiate()"
  ```

### Configuration
Environment configurations are managed using environment variables. To configure your local environment:
1. Copy the template configuration file:
   ```bash
   cp .env.example .env
   ```
2. Open the newly created `.env` file and configure the parameters (database connection strings, SMTP settings, local upload paths) to match your environment.

### Installation & Run

#### Backend Server
1. Navigate to the backend directory and set up a virtual environment:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   ```
2. Install the backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Start the application development server:
   ```bash
   uvicorn app.main:app --reload
   ```
   *The interactive API documentation is available at `http://localhost:8000/docs`.*

#### Frontend Web Application
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install the package dependencies:
   ```bash
   npm install
   ```
3. Run the hot-reloading development server:
   ```bash
   npm run dev
   ```

---

## 5. System Design Conventions & Rules

To maintain high architectural integrity, all codebase contributions must adhere to the following rules:

1. **Strict Multi-Tenancy:** Every user-created or transactional document must store an `org_id` reference to maintain data isolation.
2. **Transaction Integrity:** Operations modifying points balances, reward stock inventory, or carbon credit sales must be executed within database transactions using atomic modifiers (e.g., `$inc` with validation filters) to avoid race conditions.
3. **Audit Provenance:** Carbon ledger entries must snapshot the calculation parameters, input quantities, and factor constants used at the time of entry to ensure complete audit traceability.
4. **Dynamic State Derivation:** Derived values—such as challenge progress percentages, department carbon rollups, or compliance overdue markers—must be calculated at query time to prevent out-of-sync cache bugs.
5. **No Data Deletions:** Archive statuses or soft-deletes are used instead of physical document removals for compliance and transactional audit records.
