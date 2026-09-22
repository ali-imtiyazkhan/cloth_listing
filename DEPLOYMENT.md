# Deployment Guide: Backend on Render + Frontend on Vercel with Cloudinary

## Architecture
- **Backend**: Render (Web Service + Background Worker)
- **Database**: Render PostgreSQL
- **Cache/Queue**: Render Redis
- **Message Queue**: Upstash Kafka (serverless)
- **File Storage**: Cloudinary (images)
- **Frontend**: Vercel

---

## Prerequisites

1. **GitHub repo** with this code
2. **Cloudinary account** (free tier: 25GB storage, 25GB bandwidth)
3. **Upstash Kafka account** (free tier: 10K messages/day)
4. **Google AI Studio API key** for Gemini
5. **Render account**
6. **Vercel account**

---

## 1. Cloudinary Setup

1. Create account at [cloudinary.com](https://cloudinary.com)
2. Go to Dashboard → Get your:
   - **Cloud Name**
   - **API Key**
   - **API Secret**
3. Create upload preset (optional): Settings → Upload → Upload presets → Add unsigned preset for client uploads

---

## 2. Upstash Kafka Setup

1. Create account at [upstash.com](https://upstash.com)
2. Create Kafka cluster (choose region close to Render: Oregon/US-West)
3. Get credentials:
   - **Bootstrap Server** (e.g., `xxx.upstash.io:9092`)
   - **Username** (SASL username)
   - **Password** (SASL password)

---

## 3. Render Deployment (via Blueprint)

### Option A: One-click Blueprint (Recommended)

1. Fork this repo to your GitHub
2. Go to [Render Dashboard](https://dashboard.render.com) → New → Blueprint
3. Connect your repo
4. Render will detect `render.yaml` and create:
   - PostgreSQL database (`tryon-db`)
   - Redis (`tryon-redis`)
   - Backend Web Service (`tryon-backend`)
   - Background Worker (`tryon-worker`)

### Option B: Manual Setup

If not using Blueprint, create services manually:

#### PostgreSQL Database
- New → PostgreSQL → Name: `tryon-db` → Free plan

#### Redis
- New → Redis → Name: `tryon-redis` → Free plan

#### Backend Web Service
- New → Web Service → Connect repo
- **Root Directory**: `backend`
- **Build Command**: `npm install && npm run db:generate && npm run build`
- **Start Command**: `npm run start`
- **Health Check Path**: `/health`

#### Background Worker
- New → Background Worker → Same repo
- **Root Directory**: `backend`
- **Build Command**: `npm install && npm run db:generate && npm run build`
- **Start Command**: `npm run worker`

---

## 4. Environment Variables (Render)

### Backend Web Service & Worker (same values)

| Variable | Value | Source |
|----------|-------|--------|
| `NODE_ENV` | `production` | - |
| `PORT` | `10000` | - |
| `DATABASE_URL` | Auto-linked from `tryon-db` | Render |
| `REDIS_URL` | Auto-linked from `tryon-redis` | Render |
| `FRONTEND_ORIGIN` | `https://your-frontend.vercel.app` | Your Vercel URL |
| `GEMINI_API_KEY` | Your Google AI Studio key | **Secret** |
| `GEMINI_IMAGE_MODEL` | `gemini-3.1-flash-image` | - |
| `KAFKA_BROKERS` | `xxx.upstash.io:9092` | Upstash |
| `KAFKA_USERNAME` | Upstash SASL username | **Secret** |
| `KAFKA_PASSWORD` | Upstash SASL password | **Secret** |
| `KAFKA_CLIENT_ID` | `tryon-app` | - |
| `KAFKA_TOPIC` | `tryon-jobs` | - |
| `KAFKA_GROUP_ID` | `tryon-workers` | - |
| `ADMIN_API_KEY` | Auto-generated (or set your own) | **Secret** |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name | **Secret** |
| `CLOUDINARY_API_KEY` | Your Cloudinary API key | **Secret** |
| `CLOUDINARY_API_SECRET` | Your Cloudinary API secret | **Secret** |
| `OUTPUT_DIR` | `./generated` | - |
| `DUMMY_IMAGE_PATH` | `./assets/dummy.png` | - |

> **Note**: Mark sensitive values as "Secret" in Render UI (lock icon)

---

## 5. Run Database Migrations

After first deploy, run once in Render Shell (Web Service):

```bash
npm run db:migrate
```

Or use Render's "Run Command" feature.

---

## 6. Upload Dummy Image to Cloudinary

The worker needs a dummy/model image at `tryon/dummy` in Cloudinary.

**Option A: Upload via Cloudinary Dashboard**
1. Go to Media Library → Upload
2. Upload your dummy/model image
3. Set Public ID: `tryon/dummy`

**Option B: Upload via API (one-time)**
```bash
curl -X POST "https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload" \
  -F "file=@./assets/dummy.png" \
  -F "public_id=tryon/dummy" \
  -F "api_key=YOUR_API_KEY" \
  -F "timestamp=$(date +%s)" \
  -F "signature=YOUR_SIGNATURE"
```

---

## 7. Frontend Deployment (Vercel)

### Via Vercel CLI
```bash
cd frontend
npx vercel
```

### Via Vercel Dashboard
1. Import repo → Select `frontend` folder
2. Framework: Vite (auto-detected)
3. Build Command: `npm run build`
4. Output Directory: `dist`

### Environment Variables (Vercel Dashboard → Settings → Environment Variables)

| Variable | Value |
|----------|-------|
| `VITE_API_BASE` | `https://tryon-backend.onrender.com` |

---

## 8. Update CORS

After Vercel deployment, update `FRONTEND_ORIGIN` in Render backend service to match your exact Vercel URL (e.g., `https://bags-editorial-collage.vercel.app`).

Redeploy backend service.

---

## 9. Test Deployment

1. Visit your Vercel URL
2. Try uploading a clothing image (requires admin key)
3. Check job status polling works
4. Verify generated images load from Cloudinary

---

## File Structure Changes for Cloudinary

### Backend
- `src/services/cloudinaryService.ts` - New Cloudinary wrapper
- `src/routes/uploadRoute.ts` - Uses memory storage + Cloudinary upload
- `src/routes/adminRoute.ts` - Uses memory storage + Cloudinary upload/delete
- `src/queue/worker.ts` - Fetches images from Cloudinary URLs, uploads results to Cloudinary
- `src/services/geminiService.ts` - Fetches images from URLs instead of local files
- `src/server.ts` - Removed static file serving

### Database Schema (unchanged)
- `clothImagePath` now stores Cloudinary **public_id** (e.g., `tryon/uploads/cloth-uuid`)
- `imageUrl` stores Cloudinary **optimized delivery URL**
- `resultUrl` stores Cloudinary **delivery URL** for try-on results

---

## Troubleshooting

### Worker not processing jobs
- Check Render worker logs
- Verify Kafka credentials in both web service and worker
- Ensure `KAFKA_BROKERS` includes port (e.g., `xxx.upstash.io:9092`)

### Images not loading
- Check Cloudinary credentials
- Verify dummy image exists at `tryon/dummy` in Cloudinary
- Check browser network tab for 404s

### CORS errors
- Ensure `FRONTEND_ORIGIN` exactly matches Vercel URL (no trailing slash)
- Include protocol (`https://`)

### Database connection fails
- Run `npm run db:migrate` in Render shell
- Check `DATABASE_URL` is internal connection string (not external)

---

## Cost Estimate (Free Tiers)

| Service | Free Tier Limits |
|---------|-----------------|
| Render Web Service | 750 hrs/month, sleeps after 15 min inactivity |
| Render Worker | 750 hrs/month |
| Render PostgreSQL | 90 days free, then $7/mo |
| Render Redis | 25MB free |
| Upstash Kafka | 10K messages/day, 10MB storage |
| Cloudinary | 25GB storage, 25GB bandwidth/month |
| Vercel | Unlimited personal projects |
| Gemini API | Free tier available |

---

## Production Considerations

1. **Upgrade Render plans** for no sleep, custom domains, more resources
2. **Add Cloudinary transformations** for optimized delivery (already using `f_auto,q_auto`)
3. **Set up monitoring** (Render metrics, Upstash logs)
4. **Configure backup** for PostgreSQL
5. **Add rate limiting** per user (currently per IP)
6. **Use signed uploads** for client-side uploads to Cloudinary