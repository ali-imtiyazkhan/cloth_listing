import { consumer } from './kafkaClient.js';
import { config } from '../config.js';
import { generateTryOnImage } from '../services/geminiService.js';
import { setJobStatus } from '../services/redisService.js';
import { prisma } from '../db/prisma.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, '../../', config.outputDir);
const DUMMY_IMAGE_PATH = path.resolve(__dirname, '../../', config.dummyImagePath);

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 2000;

async function ensureOutputDir(): Promise<void> {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function updateJobStatus(jobId: string, status: string, data?: { resultUrl?: string; error?: string }): Promise<void> {
  await prisma.tryOnJob.update({
    where: { jobId },
    data: {
      status,
      resultUrl: data?.resultUrl,
      errorMessage: data?.error,
      completedAt: status === 'done' || status === 'failed' ? new Date() : undefined,
    },
  });
}

async function incrementRetryCount(jobId: string): Promise<number> {
  const job = await prisma.tryOnJob.update({
    where: { jobId },
    data: { retryCount: { increment: 1 } },
    select: { retryCount: true },
  });
  return job.retryCount;
}

async function processJob(job: { jobId: string; clothImagePath: string }): Promise<void> {
  const { jobId, clothImagePath } = job;
  
  await setJobStatus(jobId, 'processing');
  await updateJobStatus(jobId, 'processing');
  
  try {
    const imageBuffer = await generateTryOnImage(clothImagePath, DUMMY_IMAGE_PATH);
    await ensureOutputDir();
    
    const outputPath = path.join(OUTPUT_DIR, `${jobId}.png`);
    await fs.writeFile(outputPath, imageBuffer);
    
    const resultUrl = `/generated/${jobId}.png`;
    await setJobStatus(jobId, 'done', { resultUrl });
    await updateJobStatus(jobId, 'done', { resultUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const retryCount = await incrementRetryCount(jobId);
    
    if (retryCount < MAX_RETRIES) {
      const delay = BASE_RETRY_DELAY_MS * Math.pow(2, retryCount - 1);
      console.log(`Job ${jobId} failed (attempt ${retryCount}/${MAX_RETRIES}), retrying in ${delay}ms: ${message}`);
      
      await setJobStatus(jobId, 'queued');
      await updateJobStatus(jobId, 'queued', { error: message });
      
      await sleep(delay);
      
      await processJob(job);
    } else {
      console.error(`Job ${jobId} failed after ${MAX_RETRIES} retries: ${message}`);
      await setJobStatus(jobId, 'failed', { error: message });
      await updateJobStatus(jobId, 'failed', { error: message });
    }
  }
}

let isShuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    console.log('Shutdown already in progress...');
    return;
  }
  
  isShuttingDown = true;
  console.log(`${signal} received, starting graceful shutdown...`);
  
  try {
    await consumer.disconnect();
    console.log('Kafka consumer disconnected');
    
    await prisma.$disconnect();
    console.log('Prisma disconnected');
    
    console.log('Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export async function startWorker(): Promise<void> {
  await consumer.connect();
  await consumer.subscribe({ topic: config.kafka.topic, fromBeginning: false });
  
  await consumer.run({
    eachMessage: async ({ message }: { message: { value: Buffer | null } }) => {
      if (isShuttingDown) return;
      if (!message.value) return;
      const job = JSON.parse(message.value.toString());
      await processJob(job);
    },
  });
  
  console.log('Worker started, listening for jobs...');
}

startWorker().catch((err) => {
  console.error('Worker failed to start:', err);
  process.exit(1);
});