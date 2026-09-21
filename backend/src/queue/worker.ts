import { consumer } from './kafkaClient.js';
import { config } from '../config.js';
import { generateTryOnImage } from '../services/geminiService.js';
import { setJobStatus } from '../services/redisService.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, '../../', config.outputDir);

async function ensureOutputDir(): Promise<void> {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

async function processJob(job: { jobId: string; clothImagePath: string; dummyImagePath: string }): Promise<void> {
  const { jobId, clothImagePath, dummyImagePath } = job;
  
  await setJobStatus(jobId, 'processing');
  
  try {
    const imageBuffer = await generateTryOnImage(clothImagePath, dummyImagePath);
    await ensureOutputDir();
    
    const outputPath = path.join(OUTPUT_DIR, `${jobId}.png`);
    await fs.writeFile(outputPath, imageBuffer);
    
    const resultUrl = `/generated/${jobId}.png`;
    await setJobStatus(jobId, 'done', { resultUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await setJobStatus(jobId, 'failed', { error: message });
  }
}

export async function startWorker(): Promise<void> {
  await consumer.connect();
  await consumer.subscribe({ topic: config.kafka.topic, fromBeginning: false });
  
  await consumer.run({
    eachMessage: async ({ message }: { message: { value: Buffer | null } }) => {
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