import Redis from 'ioredis';
import { config } from '../config.js';
import { JobRecord, JobStatus } from '../types.js';

const redis = new (Redis as any)(config.redis.url, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => Math.min(times * 100, 3000),
});

const JOB_KEY_PREFIX = 'tryon:job:';
const JOB_TTL_SECONDS = 24 * 60 * 60;

function jobKey(jobId: string): string {
  return `${JOB_KEY_PREFIX}${jobId}`;
}

export async function setJobStatus(
  jobId: string,
  status: JobStatus,
  extras: Partial<Pick<JobRecord, 'resultUrl' | 'error'>> = {}
): Promise<void> {
  const record: JobRecord = {
    status,
    updatedAt: new Date().toISOString(),
    ...extras,
  };
  await redis.set(jobKey(jobId), JSON.stringify(record), 'EX', JOB_TTL_SECONDS);
}

export async function getJobStatus(jobId: string): Promise<JobRecord | null> {
  const data = await redis.get(jobKey(jobId));
  if (!data) return null;
  return JSON.parse(data) as JobRecord;
}

export async function closeRedis(): Promise<void> {
  await redis.quit();
}