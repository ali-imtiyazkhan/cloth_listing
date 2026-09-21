import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { enqueueTryOnJob } from '../queue/producer.js';
import { setJobStatus } from '../services/redisService.js';
import { TryOnJob } from '../types.js';
import { config } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

const router = Router();

router.post('/api/tryon', upload.fields([{ name: 'cloth', maxCount: 1 }, { name: 'dummy', maxCount: 1 }]) as any, async (req: Request, res: Response) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  
  if (!files?.cloth?.[0]) {
    return res.status(400).json({ error: 'Cloth image is required' });
  }
  if (!files?.dummy?.[0]) {
    return res.status(400).json({ error: 'Dummy/Model image is required' });
  }

  const clothFile = files.cloth[0];
  const dummyFile = files.dummy[0];

  const jobId = uuidv4();

  const job: TryOnJob = {
    jobId,
    clothImagePath: clothFile.path,
    dummyImagePath: dummyFile.path,
    createdAt: new Date().toISOString(),
  };

  await setJobStatus(jobId, 'queued');
  await enqueueTryOnJob(job);

  res.status(202).json({ jobId });
});

export default router;