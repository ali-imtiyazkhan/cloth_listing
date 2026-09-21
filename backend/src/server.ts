import express from 'express';
import cors from 'cors';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import uploadRoute from './routes/uploadRoute.js';
import statusRoute from './routes/statusRoute.js';
import adminRoute from './routes/adminRoute.js';
import { disconnectProducer } from './queue/producer.js';
import { closeRedis } from './services/redisService.js';
import { closePrisma } from './db/prisma.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GENERATED_DIR = path.resolve(__dirname, '../../', config.outputDir);
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');

const app = express();

app.use(cors({ origin: config.frontendOrigin }));
app.use(express.json());

app.use('/generated', express.static(GENERATED_DIR));
app.use('/uploads', express.static(UPLOAD_DIR));

app.use(uploadRoute);
app.use(statusRoute);
app.use('/admin', adminRoute);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

async function start(): Promise<void> {
  const fs = await import('fs/promises');
  await fs.mkdir(GENERATED_DIR, { recursive: true });

  app.listen(config.port, () => {
    console.log(`API server running on http://localhost:${config.port}`);
  });
}

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await disconnectProducer();
  await closeRedis();
  await closePrisma();
  process.exit(0);
});

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});