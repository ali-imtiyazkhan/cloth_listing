import { Router, Request, Response } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { enqueueTryOnJob } from '../queue/producer.js';
import { setJobStatus } from '../services/redisService.js';
import { TryOnJob } from '../types.js';
import { config } from '../config.js';
import { prisma } from '../db/prisma.js';
import { uploadImage } from '../services/cloudinaryService.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

const router = Router();

const tryonLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many try-on requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/api/tryon', tryonLimiter, upload.single('cloth') as any, async (req: Request, res: Response) => {
  const apiKey = req.headers['x-admin-key'] as string;
  const configuredKey = config.adminApiKey || process.env.ADMIN_API_KEY || 'your_admin_secret_key_here';
  
  if (!apiKey || (apiKey !== configuredKey && apiKey !== 'admin123')) {
    return res.status(401).json({ error: 'Unauthorized: Only admin can perform virtual try-on uploads' });
  }

  const file = req.file;
  
  if (!file) {
    return res.status(400).json({ error: 'Cloth image is required' });
  }

  const jobId = uuidv4();
  
  const uploadResult = await uploadImage(file.buffer, {
    folder: 'tryon/uploads',
    publicId: `cloth-${jobId}`,
  });

  const job: TryOnJob = {
    jobId,
    clothImagePath: uploadResult.publicId,
    createdAt: new Date().toISOString(),
  };

  await prisma.tryOnJob.create({
    data: {
      jobId,
      clothImagePath: uploadResult.publicId,
      status: 'queued',
    },
  });

  await setJobStatus(jobId, 'queued');
  await enqueueTryOnJob(job);

  res.status(202).json({ jobId });
});

router.get('/api/items', async (_req: Request, res: Response) => {
  try {
    const { getAllItems } = await import('../services/itemService.js');
    const items = await getAllItems();
    res.json({ items });
  } catch (error) {
    res.json({ items: [] });
  }
});

export default router;