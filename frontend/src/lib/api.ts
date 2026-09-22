import { getAdminKey } from "./adminAuth";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

export interface JobRecord {
  status: "queued" | "processing" | "done" | "failed";
  resultUrl?: string;
  error?: string;
  updatedAt: string;
}

export interface BackendClothItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  clothImagePath: string;
  createdAt: string;
}

export async function submitTryOnJob(
  cloth: File,
  customAdminKey?: string
): Promise<{ jobId: string }> {
  const adminKey = customAdminKey || getAdminKey() || "";
  const formData = new FormData();
  formData.append("cloth", cloth);

  const res = await fetch(`${API_BASE}/api/tryon`, {
    method: "POST",
    headers: {
      "x-admin-key": adminKey,
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error || "Upload failed: Admin access required");
  }

  return res.json();
}

export async function getJobStatus(jobId: string): Promise<JobRecord> {
  const res = await fetch(`${API_BASE}/api/tryon/${jobId}`);

  if (res.status === 404) {
    throw new Error("Job not found");
  }

  if (!res.ok) {
    throw new Error("Failed to get job status");
  }

  return res.json();
}

export function resultImageUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${API_BASE}${path}`;
}

export async function fetchPublicItems(): Promise<BackendClothItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/items`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
  } catch {
    return [];
  }
}

export async function createClothItem(formData: FormData): Promise<BackendClothItem> {
  const adminKey = getAdminKey() || "";
  const res = await fetch(`${API_BASE}/admin/items`, {
    method: "POST",
    headers: {
      "x-admin-key": adminKey,
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to create item" }));
    throw new Error(err.error || "Failed to create item: Admin access required");
  }

  return res.json();
}

export async function deleteClothItem(id: string): Promise<boolean> {
  const adminKey = getAdminKey() || "";
  const res = await fetch(`${API_BASE}/admin/items/${id}`, {
    method: "DELETE",
    headers: {
      "x-admin-key": adminKey,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to delete item" }));
    throw new Error(err.error || "Failed to delete item: Admin access required");
  }

  return true;
}

export async function updateClothItem(
  id: string,
  formData: FormData
): Promise<BackendClothItem> {
  const adminKey = getAdminKey() || "";
  const res = await fetch(`${API_BASE}/admin/items/${id}`, {
    method: "PUT",
    headers: {
      "x-admin-key": adminKey,
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to update item" }));
    throw new Error(err.error || "Failed to update item: Admin access required");
  }

  return res.json();
}