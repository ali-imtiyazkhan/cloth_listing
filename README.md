# Fitting Room — Virtual Try-On Website

## Project Structure

```
bags-editorial-collage/
├── docker-compose.yml          # Kafka, Zookeeper, Redis for local dev
├── frontend/                   # Vite + React + TypeScript + Tailwind (existing editorial site)
│   ├── src/
│   │   ├── lib/api.ts          # API client for try-on backend
│   │   └── ...
│   ├── package.json
│   └── .env.local.example
└── backend/                    # Express + TypeScript + Kafka + Redis + Gemini
    ├── src/
    │   ├── config.ts
    │   ├── types.ts
    │   ├── server.ts
    │   ├── routes/
    │   │   ├── uploadRoute.ts  # POST /api/tryon
    │   │   └── statusRoute.ts  # GET /api/tryon/:jobId
    │   ├── queue/
    │   │   ├── kafkaClient.ts
    │   │   ├── producer.ts
    │   │   └── worker.ts
    │   └── services/
    │       ├── geminiService.ts
    │       └── redisService.ts
    ├── package.json
    ├── tsconfig.json
    └── .env.example
```

## Quick Start

### 1. Start Infrastructure
```bash
docker compose up -d
```

### 2. Backend
```bash
cd backend
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
npm install
npm run dev          # API on :4000

# In another terminal:
npm run worker       # Kafka consumer
```

### 3. Frontend
```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev          # Vite on :5173
```

## API

- `POST /api/tryon` — multipart/form-data with `cloth` and `dummy` files → `202 { jobId }`
- `GET /api/tryon/:jobId` → `JobRecord` (poll until `done` or `failed`)
- `GET /generated/:filename` — static generated images

## Environment Variables

**backend/.env**
```
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173
GEMINI_API_KEY=your_key_here
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=tryon-app
KAFKA_TOPIC=tryon-jobs
KAFKA_GROUP_ID=tryon-workers
REDIS_URL=redis://localhost:6379
OUTPUT_DIR=./generated
```

**frontend/.env.local**
```
VITE_API_BASE=http://localhost:4000
```