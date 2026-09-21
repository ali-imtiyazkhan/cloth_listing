import { Router, Request, Response } from 'express';
import { getJobStatus } from '../services/redisService.js';

const router = Router();

router.get('/api/tryon/:jobId', async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const record = await getJobStatus(jobId);

  if (!record) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json(record);
});

export default router;