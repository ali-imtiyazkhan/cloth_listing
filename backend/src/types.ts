export type JobStatus = 'queued' | 'processing' | 'done' | 'failed';

export interface TryOnJob {
  jobId: string;
  clothImagePath: string;
  createdAt: string;
}

export interface JobRecord {
  status: JobStatus;
  resultUrl?: string;
  error?: string;
  updatedAt: string;
}