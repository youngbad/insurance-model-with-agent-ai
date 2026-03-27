# Insurance Risk & Pricing System with AI Agent

A production-grade web application that simulates an **insurance risk/pricing input system** enhanced by an **LLM-powered AI assistant**.

## 🏗️ Architecture

```
insurance-model-with-agent-ai/
├── backend/                    # Python + FastAPI
│   ├── app/
│   │   ├── api/               # REST endpoints
│   │   │   ├── sessions.py    # Session management
│   │   │   ├── input_data.py  # POST /input-data
│   │   │   ├── risk_score.py  # GET /risk-score
│   │   │   ├── chat.py        # POST /chat/stream (SSE)
│   │   │   ├── suggestions.py # GET /suggestions + POST /validate
│   │   │   └── tooltip.py     # GET /tooltip/{field}
│   │   ├── core/
│   │   │   ├── config.py      # Settings (pydantic-settings)
│   │   │   └── database.py    # SQLite via SQLAlchemy async
│   │   ├── models/
│   │   │   ├── db_models.py   # SQLAlchemy ORM models
│   │   │   └── schemas.py     # Pydantic schemas
│   │   ├── rag/
│   │   │   └── pipeline.py    # FAISS RAG pipeline
│   │   ├── services/
│   │   │   └── agent_service.py  # AI agent + risk scoring
│   │   └── main.py            # FastAPI app entry point
│   ├── data/
│   │   └── knowledge_base/    # Insurance domain knowledge (Markdown)
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                  # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── form/          # Multi-step form wizard
│   │   │   ├── chat/          # AI chat panel
│   │   │   ├── charts/        # Risk score visualization
│   │   │   └── grid/          # AG Grid data table
│   │   ├── hooks/
│   │   │   └── useSession.tsx # Session context
│   │   ├── services/
│   │   │   └── api.ts         # API client
│   │   ├── types/
│   │   │   └── index.ts       # TypeScript types
│   │   └── App.tsx
│   ├── package.json
│   └── Dockerfile
└── docker-compose.yml
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- OpenAI API key (optional — AI features degrade gracefully without it)

### Option 1: Local Development

**Backend:**
```bash
cd backend
cp .env.example .env
# Edit .env and set OPENAI_API_KEY=sk-...
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

**API docs:** http://localhost:8000/docs

### Option 2: Docker Compose

```bash
# Copy and configure environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Build and start
docker compose up --build

# Open http://localhost
```

## 🤖 AI Features

| Feature | Description |
|---------|-------------|
| **Chat Assistant** | Context-aware chat with full insurance knowledge base |
| **Inline Suggestions** | AI-powered field autofill with `✨ suggest` buttons |
| **RAG Pipeline** | FAISS vector store with 3 insurance knowledge documents |
| **Streaming** | Server-Sent Events for real-time chat responses |
| **Validation** | Anomaly detection with severity-graded warnings |
| **Smart Tooltips** | Field-level explanations powered by knowledge base |
| **What-If Scenarios** | Automatic premium impact analysis for 3 scenarios |

## 📊 Domain Model

### Input Sections
1. **General Information** — Company name, industry, country, revenue, employees
2. **Historical Experience** — Claims count, claim value, loss ratio, frequency
3. **Exposure** — Assets value, locations, risk categories, operational complexity
4. **Derived Metrics** — Risk score (0-100), suggested premium, AI explanation

### Risk Score Formula
- Loss History: 30%
- Exposure: 25%
- Industry Risk: 20%
- Operational Complexity: 15%
- Financial Stability: 10%

## 🔌 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/sessions` | Create new session |
| `POST` | `/input-data` | Save insurance inputs |
| `GET` | `/input-data/{session_id}` | Retrieve saved inputs |
| `GET` | `/risk-score/{session_id}` | Calculate risk score |
| `POST` | `/chat/stream` | Streaming chat (SSE) |
| `GET` | `/chat/history/{session_id}` | Get chat history |
| `POST` | `/suggestions` | Field suggestion |
| `POST` | `/suggestions/bulk` | Bulk suggestions |
| `POST` | `/validate` | Field validation |
| `GET` | `/tooltip/{field}` | AI tooltip |
| `GET` | `/health` | Health check |

## 🛠️ Tech Stack

**Backend:**
- FastAPI + Uvicorn
- SQLAlchemy (async) + SQLite/aiosqlite
- LangChain + FAISS + OpenAI Embeddings
- OpenAI GPT-4o-mini

**Frontend:**
- React 18 + TypeScript + Vite
- Material UI v6
- AG Grid (Community)
- Recharts
- React Markdown

## ⚙️ Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | — | OpenAI API key (required for AI features) |
| `DATABASE_URL` | sqlite+aiosqlite:///./insurance.db | Database connection |
| `CORS_ORIGINS` | localhost:5173,localhost:3000 | Allowed origins |
| `VECTOR_DB_PATH` | ./data/vector_store | FAISS index location |
| `KNOWLEDGE_BASE_PATH` | ./data/knowledge_base | Markdown documents |

## 🎁 Bonus Features

- ✅ Risk score gauge chart + What-If bar chart (Recharts)
- ✅ LLM-generated risk explanation paragraph
- ✅ What-if simulation table (3 scenarios)
- ✅ Streaming responses via Server-Sent Events
- ✅ Debounced API calls on form blur
- ✅ Optimistic UI updates
- ✅ Graceful degradation when OpenAI key is absent
- ✅ Session persistence (localStorage)