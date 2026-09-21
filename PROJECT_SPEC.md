# Fitting Room — Virtual Try-On Website

## What this is

A website where a user (admin, for v1) uploads a garment/cloth image and a
model/dummy (mannequin) image. The system generates a photorealistic image of
the model wearing that garment, and stores/serves the result.

## Pipeline (matches original design diagram)

```
cloth image upload (admin)
        │
        ▼
   upload endpoint (backend)
        │
        ▼
   Kafka queue (job enqueued)
        │
        ▼
   worker consumes job
        │
        ▼
   image-generation model (LLM/diffusion) composites cloth onto dummy
        │
        ▼
   generated image written to disk/storage
        │
        ▼
   Redis holds job status + result URL → frontend polls and displays it
```

Redis is used for fast job-status lookups (queued / processing / done /
failed) so the frontend can poll without hitting a database. Kafka decouples
the slow generation step (5–30s) from the HTTP request/response cycle.

## Tech stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Queue**: Kafka (KafkaJS client)
- **Cache / job state**: Redis (ioredis client)
- **Image generation**: Google Gemini API (`@google/genai` SDK), model
  `gemini-2.5-flash-image` (or newer — see "Model choice" below)
- **File uploads**: Multer (disk storage)
- **Local dev infra**: Docker Compose (Kafka + Zookeeper + Redis)

## Repository structure

```
tryon-app/
├── docker-compose.yml          # Kafka, Zookeeper, Redis for local dev
├── README.md
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── src/
│       ├── config.ts            # loads env vars into a typed config object
│       ├── types.ts             # TryOnJob, JobRecord, JobStatus types
│       ├── server.ts            # Express app entry point
│       ├── routes/
│       │   ├── uploadRoute.ts   # POST /api/tryon — accepts cloth+dummy, enqueues job
│       │   └── statusRoute.ts   # GET /api/tryon/:jobId — returns job status/result
│       ├── queue/
│       │   ├── kafkaClient.ts   # shared Kafka client instance
│       │   ├── producer.ts      # enqueueTryOnJob()
│       │   └── worker.ts        # consumer entry point — processes jobs
│       └── services/
│           ├── geminiService.ts # generateTryOnImage() — calls Gemini API
│           └── redisService.ts  # setJobStatus() / getJobStatus()
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── postcss.config.js
    ├── next.config.js
    ├── .env.local.example
    ├── app/
    │   ├── layout.tsx
    │   ├── globals.css
    │   └── page.tsx              # upload UI + polling + result display
    └── lib/
        └── api.ts                 # submitTryOnJob(), getJobStatus(), resultImageUrl()
```

## Data model

```ts
type JobStatus = "queued" | "processing" | "done" | "failed";

interface TryOnJob {
  jobId: string;
  clothImagePath: string;
  dummyImagePath: string;
  createdAt: string;
}

interface JobRecord {
  status: JobStatus;
  resultUrl?: string;
  error?: string;
  updatedAt: string;
}
```

Redis key pattern: `tryon:job:{jobId}` → JSON-serialized `JobRecord`, 24h TTL.

## API contract

### `POST /api/tryon`
- **Body**: `multipart/form-data` with fields `cloth` (file) and `dummy` (file)
- **Response**: `202 { jobId: string }`
- Validates both files are present, saves them to `backend/uploads/`, enqueues
  a Kafka message on topic `tryon-jobs`, sets initial Redis status to
  `queued`.

### `GET /api/tryon/:jobId`
- **Response**: `200 JobRecord` or `404` if unknown jobId
- Frontend polls this every ~2s until status is `done` or `failed`.

### `GET /generated/:filename`
- Static file serving of generated result images (`backend/generated/`).

## Worker logic (`queue/worker.ts`)

1. Consumes `tryon-jobs` topic (consumer group `tryon-workers`).
2. Sets Redis status to `processing`.
3. Calls `generateTryOnImage(clothImagePath, dummyImagePath)`.
4. Writes the returned image buffer to `backend/generated/{jobId}.png`.
5. Sets Redis status to `done` with `resultUrl: /generated/{jobId}.png`.
6. On any error, sets status to `failed` with the error message.
7. Multiple worker processes can run in the same consumer group to scale
   horizontally.

## Gemini integration (`services/geminiService.ts`)

- Uses `@google/genai` SDK, `GoogleGenAI({ apiKey })`.
- Reads both images from disk, base64-encodes them as `inlineData` parts.
- Sends a single `generateContent` call with: a text prompt instructing the
  model to composite the garment onto the person while preserving garment
  color/pattern/logo and preserving the person's pose/background, plus the
  two image parts.
- Extracts the generated image from
  `response.candidates[0].content.parts[].inlineData.data` (base64) and
  returns it as a `Buffer`.

### Model choice / pricing (as of Sep 2026 — verify current pricing before building cost estimates)

| Model | Approx. cost/image | Notes |
|---|---|---|
| Imagen 4 Fast | ~$0.02 | No reference/edit support — not suitable here |
| Gemini 2.5 Flash Image | ~$0.039 | Good default for this project; **shuts down Oct 2, 2026** |
| Imagen 4 Standard | ~$0.04 | No reference/edit support |
| Gemini 3.1 Flash Image | ~$0.045–$0.15 | Newer replacement for 2.5 Flash Image; prefer this for anything long-lived |
| Imagen 4 Ultra | ~$0.06 | No reference/edit support |
| Gemini 3 Pro Image | ~$0.13–$0.24 | Best quality/garment fidelity if budget allows |

Batch API gives ~50% discount for non-realtime generation. Free tier is
available via Google AI Studio (aistudio.google.com) for prototyping —
rate-limited, no credit card required.

**Known limitation**: general-purpose Gemini image generation can distort
garment prints/logos/exact fit compared to models purpose-built for virtual
try-on. If quality is insufficient, swap `geminiService.ts` for:
- **IDM-VTON** or **OOTDiffusion** (open-source, self-hosted or via Hugging
  Face Inference API's free tier) — purpose-built for garment-on-person
  compositing, generally better fidelity.
- A hosted virtual try-on API (e.g. Fashn AI) as a paid alternative.

## Frontend behavior (`app/page.tsx`)

- Two drag-and-drop upload wells: "Garment" and "Model / dummy". Clicking
  opens a file picker; dropping a file also works. Shows an image preview
  once a file is chosen.
- "Generate preview" button disabled until both files are selected; disabled
  again while a job is in flight.
- On submit: calls `submitTryOnJob(cloth, dummy)` → gets `jobId` → polls
  `getJobStatus(jobId)` every 2s.
- Shows status text ("Queued…" / "Generating your preview…") while waiting.
- On `done`: renders the result image full-width below the upload section.
- On `failed`: shows the error message in an inline error banner.
- Visual design: warm editorial palette — canvas `#F7F4EE`, ink `#1C1B19`,
  accent `#B5482A` ("thread"), muted `#8A8577` ("stone"); `Fraunces` for
  display type, `Inter` for body text; minimal borders instead of shadows/
  rounded cards.

## Environment variables

**backend/.env**
```
PORT=4000
FRONTEND_ORIGIN=http://localhost:3000
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
NEXT_PUBLIC_API_BASE=http://localhost:4000
```

## Local setup

```bash
docker compose up -d                     # Kafka + Zookeeper + Redis

cd backend
cp .env.example .env                     # set GEMINI_API_KEY
npm install
npm run dev                              # Express API on :4000

# second terminal
cd backend
npm run worker                           # Kafka consumer

# third terminal
cd frontend
cp .env.local.example .env.local
npm install
npm run dev                              # Next.js on :3000
```

## Known gaps / next steps for the agent to consider

- No authentication on the upload endpoint yet — needed before any public
  deploy, since each generation costs money.
- Generated images are stored on local disk — swap for S3/GCS/Cloudinary for
  production durability and CDN delivery.
- No persistent database (Postgres, etc.) — job records live only in Redis
  with a 24h TTL. Add a DB if history/audit of past try-ons is needed.
- No retry/backoff logic in the worker for transient Gemini API failures.
- No rate limiting on the upload endpoint.
- No image validation beyond Multer's 10MB size limit (e.g. no check that
  uploaded files are actually images, no dimension constraints).
