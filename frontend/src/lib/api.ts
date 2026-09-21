const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export interface JobRecord {
  status: 'queued' | 'processing' | 'done' | 'failed';
  resultUrl?: string;
  error?: string;
  updatedAt: string;
}

export async function submitTryOnJob(cloth: File, dummy: File): Promise<{ jobId: string }> {
  const formData = new FormData();
  formData.append('cloth', cloth);
  formData.append('dummy', dummy);

  const res = await fetch(`${API_BASE}/api/tryon`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Upload failed');
  }

  return res.json();
}

export async function getJobStatus(jobId: string): Promise<JobRecord> {
  const res = await fetch(`${API_BASE}/api/tryon/${jobId}`);
  
  if (res.status === 404) {
    throw new Error('Job not found');
  }
  
  if (!res.ok) {
    throw new Error('Failed to get job status');
  }
  
  return res.json();
}

export function resultImageUrl(path: string): string {
  return `${API_BASE}${path}`;
}