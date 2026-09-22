import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import uploadRoute from './routes/uploadRoute.js';
import statusRoute from './routes/statusRoute.js';
import adminRoute from './routes/adminRoute.js';
import { disconnectProducer } from './queue/producer.js';
import { closeRedis } from './services/redisService.js';
import { closePrisma } from './db/prisma.js';

const app = express();

app.use(cors({ origin: config.frontendOrigin }));
app.use(express.json());

app.use(uploadRoute);
app.use(statusRoute);
app.use('/admin', adminRoute);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

async function start(): Promise<void> {
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