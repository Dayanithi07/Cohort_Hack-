# 📋 Project Workflow - Competitor Intelligence Tracker

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Docker Compose Environment                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Postgres   │  │    Redis     │  │   Backend    │          │
│  │   Database   │  │   (Broker)   │  │   (FastAPI)  │          │
│  │  Port: 5432  │  │  Port: 6379  │  │  Port: 8000  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │Celery Worker │  │ Celery Beat  │                            │
│  │ (Process     │  │ (Scheduler)  │                            │
│  │  Tasks)      │  │              │                            │
│  └──────────────┘  └──────────────┘                            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Schema

```
┌─────────────┐         ┌──────────────┐         ┌────────────────┐
│    users    │         │  businesses  │         │  competitors   │
├─────────────┤         ├──────────────┤         ├────────────────┤
│ id          │         │ id           │         │ id             │
│ username    │◄────┐   │ name         │◄────┐   │ name           │
│ email       │     │   │ owner_id     │     │   │ domain_url     │
│ hashed_pwd  │     │   │ industry     │     │   │ business_id    │
│ is_active   │     │   │ website      │     │   │ status         │
└─────────────┘     │   │ ...          │     │   │ priority_level │
                    │   └──────────────┘     │   └────────────────┘
                    │                        │            │
                    └────────────────────────┘            │
                                                          │
         ┌────────────────────────────────────────────────┤
         │                                                │
         ▼                                                │
┌──────────────────┐  ┌──────────────┐  ┌───────────────┼─────────┐
│ raw_scraped_data │  │ cleaned_data │  │    alerts     │insights │
├──────────────────┤  ├──────────────┤  ├───────────────┼─────────┤
│ id               │  │ id           │  │ id            │ id      │
│ competitor_id    │  │ competitor_id│  │ competitor_id │ comp... │
│ url              │  │ url          │  │ alert_type    │ type    │
│ payload (JSON)   │  │ product_name │  │ message       │ text    │
│ scraped_at       │  │ price        │  │ created_at    │ created │
└──────────────────┘  │ metadata     │  └───────────────┴─────────┘
                      │ scraped_at   │
                      └──────────────┘

┌──────────────────┐
│ scraper_configs  │
├──────────────────┤
│ id               │
│ business_id      │
│ scraper_type     │
│ config (JSON)    │
└──────────────────┘
```

---

## 🔐 API Endpoints

### Authentication & Users
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login (get JWT token)
- `GET /api/v1/users/me` - Get current user

### Business Management
- `POST /api/v1/business/onboard` - Initial business setup
- `GET /api/v1/businesses/` - List user's businesses
- `POST /api/v1/businesses/` - Create business
- `GET /api/v1/businesses/{id}` - Get business details
- `PUT /api/v1/businesses/{id}` - Update business
- `DELETE /api/v1/businesses/{id}` - Delete business

### Competitor Tracking
- `GET /api/v1/competitors/?business_id={id}` - List competitors
- `POST /api/v1/competitors/` - Add competitor
- `GET /api/v1/competitors/{id}` - Get competitor details
- `PUT /api/v1/competitors/{id}` - Update competitor
- `DELETE /api/v1/competitors/{id}` - Delete competitor
- `GET /api/v1/competitors/suggestions?business_id={id}` - Get competitor suggestions
- `POST /api/v1/competitors/approve` - Approve suggested competitor
- `POST /api/v1/competitors/{id}/scrape` - **Trigger scraping task**

### Scraper Configuration
- `GET /api/v1/scraper-configs/` - List configs
- `POST /api/v1/scraper-configs/` - Create config
- `GET /api/v1/scraper-configs/{id}` - Get config
- `PUT /api/v1/scraper-configs/{id}` - Update config
- `DELETE /api/v1/scraper-configs/{id}` - Delete config

---

## 🎯 Complete User Workflow

### Phase 1: User Onboarding (Manual)
```
1. User registers
   POST /api/v1/auth/register
   ↓
2. Receive JWT token
   {"access_token": "eyJ...", "token_type": "bearer"}
   ↓
3. Create business profile
   POST /api/v1/businesses/
   Body: {"name": "My SaaS", "industry": "Software"}
   ↓
4. Add competitors
   POST /api/v1/competitors/
   Body: {"name": "Competitor A", "domain_url": "https://...", "business_id": 1}
```

### Phase 2: Data Collection (Automated)
```
5. Trigger scraping (Manual or Scheduled)
   POST /api/v1/competitors/{id}/scrape
   ↓
   Returns: {"task_id": "uuid", "status": "queued"}
   │
   ▼
┌──────────────────────────────────────────────────────────┐
│           CELERY BACKGROUND PIPELINE                     │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Step 1: scrape_competitor(competitor_id)               │
│  ├─ Fetch HTML from competitor.domain_url               │
│  ├─ Store in raw_scraped_data table                     │
│  └─ Trigger → normalize_raw_data(raw_id)                │
│                                                           │
│  Step 2: normalize_raw_data(raw_id)                     │
│  ├─ Extract structured data (product, price, etc.)      │
│  ├─ Store in cleaned_data table                         │
│  └─ Trigger → generate_insight(cleaned_id)              │
│                                                           │
│  Step 3: generate_insight(cleaned_id)                   │
│  ├─ Analyze cleaned data                                │
│  ├─ Create strategy insights                            │
│  └─ Store in strategy_insights table                    │
│                                                           │
└──────────────────────────────────────────────────────────┘

6. Periodic scraping (Every hour via Celery Beat)
   schedule_scraping()
   ├─ Fetch all active competitors
   └─ Queue scrape_competitor(id) for each
```

### Phase 3: Monitoring & Insights (Future)
```
7. View insights dashboard
8. Receive alerts on competitor changes
9. Export reports
```

---

## ⚙️ Celery Pipeline Flow (Detailed)

```
┌─────────────────────────────────────────────────────────────┐
│                    API REQUEST                              │
│  POST /api/v1/competitors/1/scrape                          │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                 ENQUEUE TASK TO REDIS                       │
│  scrape_competitor.delay(1)                                 │
│  → Queue: "celery"                                          │
│  → Returns task_id immediately                              │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│              CELERY WORKER PICKS UP TASK                    │
└─────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ TASK 1: scrape_competitor(competitor_id=1)                  │
├─────────────────────────────────────────────────────────────┤
│ 1. GET competitor from DB                                   │
│ 2. HTTP GET competitor.domain_url (with SSL verify=False)   │
│ 3. Extract: status_code, headers, HTML text                 │
│ 4. INSERT INTO raw_scraped_data:                            │
│    - competitor_id: 1                                       │
│    - url: "https://example.com"                             │
│    - payload: {status_code, headers, text}                  │
│    - scraped_at: timestamp                                  │
│ 5. Chain → normalize_raw_data.delay(raw.id)                 │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ TASK 2: normalize_raw_data(raw_id=1)                        │
├─────────────────────────────────────────────────────────────┤
│ 1. GET raw_scraped_data WHERE id=1                          │
│ 2. Parse payload.text (HTML)                                │
│ 3. Extract structured data:                                 │
│    - product_name (placeholder: None)                       │
│    - price (placeholder: None)                              │
│    - metadata_json: {source: "raw_html"}                    │
│ 4. INSERT INTO cleaned_data                                 │
│ 5. Chain → generate_insight.delay(cleaned.id)               │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ TASK 3: generate_insight(cleaned_id=1)                      │
├─────────────────────────────────────────────────────────────┤
│ 1. GET cleaned_data WHERE id=1                              │
│ 2. Analyze data (placeholder logic)                         │
│ 3. INSERT INTO strategy_insights:                           │
│    - competitor_id: 1                                       │
│    - insight_type: "scrape_complete"                        │
│    - insight_text: "Scraped data for competitor 1 at ..."   │
│ 4. Done ✓                                                   │
└─────────────────────────────────────────────────────────────┘

RESULT: Database now contains:
  ✓ 1 raw_scraped_data record
  ✓ 1 cleaned_data record
  ✓ 1 strategy_insights record
```

---

## 🧪 How to Test the Workflow

### 1. Start the System
```bash
cd Cohort_Hack-
docker compose up -d --build
docker compose exec backend alembic upgrade head
```

### 2. Open Swagger UI
Navigate to: http://localhost:8000/docs

### 3. Test Complete Flow

#### Step 1: Register User
```bash
POST /api/v1/auth/register
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "Password123!"
}

Response:
{
  "access_token": "eyJhbGci...",
  "token_type": "bearer"
}
```

#### Step 2: Create Business (Use token from step 1)
```bash
POST /api/v1/businesses/
Authorization: Bearer eyJhbGci...

{
  "name": "My SaaS Company",
  "industry": "Software"
}

Response:
{
  "id": 1,
  "name": "My SaaS Company",
  "owner_id": 1,
  ...
}
```

#### Step 3: Add Competitor
```bash
POST /api/v1/competitors/
Authorization: Bearer eyJhbGci...

{
  "name": "Competitor Inc",
  "domain_url": "https://example.com",
  "business_id": 1
}

Response:
{
  "id": 1,
  "name": "Competitor Inc",
  "domain_url": "https://example.com",
  "business_id": 1,
  "status": "active"
}
```

#### Step 4: Trigger Scraping
```bash
POST /api/v1/competitors/1/scrape
Authorization: Bearer eyJhbGci...

Response:
{
  "task_id": "uuid-here",
  "status": "queued"
}
```

### 4. Verify Pipeline Execution

Check Celery worker logs:
```bash
docker compose logs -f celery_worker
```

You should see:
```
[INFO] Task app.tasks.scrape_competitor[...] received
[INFO] Task app.tasks.scrape_competitor[...] succeeded
[INFO] Task app.tasks.normalize_raw_data[...] received
[INFO] Task app.tasks.normalize_raw_data[...] succeeded
[INFO] Task app.tasks.generate_insight[...] received
[INFO] Task app.tasks.generate_insight[...] succeeded
```

### 5. Verify Database Records

Check raw data:
```bash
docker compose exec backend python -c "from app.db.session import SessionLocal; from app.crud.crud_raw_scraped_data import raw_scraped_data as crud; db=SessionLocal(); print([r.id for r in crud.get_multi(db)]); db.close()"
```

Check cleaned data:
```bash
docker compose exec backend python -c "from app.db.session import SessionLocal; from app.crud.crud_cleaned_data import cleaned_data as crud; db=SessionLocal(); print([r.id for r in crud.get_multi(db)]); db.close()"
```

Check insights:
```bash
docker compose exec backend python -c "from app.db.session import SessionLocal; from app.crud.crud_strategy_insight import strategy_insight as crud; db=SessionLocal(); print([(i.id, i.insight_text) for i in crud.get_multi(db)]); db.close()"
```

---

## 📁 Project Structure

```
Cohort_Hack-/
├── docker-compose.yml           # Orchestrates all services
├── backend/
│   ├── Dockerfile              # Python 3.12 + FastAPI container
│   ├── requirements.txt        # Python dependencies
│   ├── main.py                 # FastAPI app entry point
│   ├── alembic/                # Database migrations
│   │   └── versions/
│   │       ├── 458afddf2056_initial_migration.py
│   │       └── 6f92a832b4b8_add_pipeline_tables.py
│   └── app/
│       ├── api/
│       │   ├── api.py          # API router setup
│       │   ├── deps.py         # Dependencies (auth, DB session)
│       │   └── endpoints/
│       │       ├── auth.py     # Register, Login
│       │       ├── users.py    # User management
│       │       ├── businesses.py
│       │       ├── business_profile.py
│       │       ├── competitors.py
│       │       └── scraper_configs.py
│       ├── core/
│       │   ├── config.py       # Settings (DB, Redis, etc.)
│       │   ├── security.py     # JWT, password hashing
│       │   └── celery_app.py   # Celery configuration
│       ├── crud/               # Database operations
│       │   ├── crud_user.py
│       │   ├── crud_business.py
│       │   ├── crud_competitor.py
│       │   ├── crud_raw_scraped_data.py
│       │   ├── crud_cleaned_data.py
│       │   └── crud_strategy_insight.py
│       ├── db/
│       │   ├── base.py         # Import all models for migrations
│       │   ├── session.py      # SQLAlchemy session
│       │   └── base_class.py   # Base model class
│       ├── models/             # SQLAlchemy models
│       │   ├── user.py
│       │   ├── business.py
│       │   ├── competitor.py
│       │   ├── raw_scraped_data.py
│       │   ├── cleaned_data.py
│       │   ├── alert.py
│       │   └── strategy_insight.py
│       ├── schemas/            # Pydantic schemas (API contracts)
│       │   ├── user.py
│       │   ├── business.py
│       │   └── competitor.py
│       └── tasks.py            # Celery tasks
└── frontend/                   # Next.js (not yet implemented)
```

---

## 🔧 Key Configuration Files

### docker-compose.yml
- Defines 5 services: postgres, redis, backend, celery_worker, celery_beat
- All services share environment variables
- Backend exposed on port 8000

### backend/requirements.txt
- fastapi, uvicorn
- sqlalchemy, alembic, psycopg2-binary
- celery[redis], redis
- python-jose (JWT), passlib[bcrypt] (passwords)
- httpx (HTTP client for scraping)
- bcrypt==3.2.2 (pinned for compatibility)

### app/core/celery_app.py
- Celery app: "competitor_intel"
- Broker & backend: Redis
- Task routing: all tasks → "celery" queue
- Beat schedule: scrape every hour

---

## ✅ What's Working

✓ User authentication (JWT)  
✓ Business CRUD operations  
✓ Competitor CRUD operations  
✓ Manual scraping trigger  
✓ Celery pipeline: scrape → normalize → insight  
✓ Periodic scraping (hourly via Celery Beat)  
✓ Database migrations  
✓ Docker orchestration  
✓ CORS configured for frontend  

---

## 🚧 What's Placeholder/TODO

⚠️ Competitor discovery (returns fake suggestions)  
⚠️ HTML parsing (normalization extracts no real data)  
⚠️ Alert generation rules (not implemented)  
⚠️ Insight analysis logic (just logs scrape completion)  
⚠️ Frontend UI (Next.js skeleton exists, not connected)  
⚠️ API endpoints for querying alerts/insights  
⚠️ Scrapy-playwright integration for JS-rendered sites  

---

## 🎯 Next Steps (Optional)

1. **Improve Scraping**
   - Implement Scrapy spider with playwright for headless browsing
   - Add retry logic, rate limiting, proxy support

2. **Real Data Extraction**
   - Parse HTML for product names, prices, features
   - Use BeautifulSoup, regex, or LLMs

3. **Alert System**
   - Detect price changes, new products, content updates
   - Send email/Slack notifications

4. **Insights Engine**
   - Compare competitor features vs your business
   - Suggest strategic actions

5. **Frontend**
   - Build dashboard for viewing competitors
   - Display alerts timeline
   - Visualize insights

6. **Testing**
   - Add pytest for API endpoints
   - Unit tests for Celery tasks
   - Integration tests for pipeline

---

## 📞 Support Commands

```bash
# View all containers
docker compose ps

# Restart a service
docker compose restart celery_worker

# View logs
docker compose logs -f backend
docker compose logs -f celery_worker

# Access backend shell
docker compose exec backend bash

# Run Alembic migration
docker compose exec backend alembic upgrade head

# Check Celery tasks
docker compose exec backend python -c "from app.core.celery_app import celery; print([t for t in celery.tasks.keys() if t.startswith('app.tasks')])"

# Check Redis queue length
docker compose exec redis redis-cli -n 0 llen celery
```

---

**Last Updated**: March 9, 2026  
**Status**: ✅ Backend Core Complete  
**Test URL**: http://localhost:8000/docs
