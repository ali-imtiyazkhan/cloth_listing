import { Prisma } from '@prisma/client';

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

export interface ClothItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  clothImagePath: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClothItemDto {
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  clothImagePath: string;
}

export interface UpdateClothItemDto {
  name?: string;
  description?: string;
  price?: number;
  category?: string;
  imageUrl?: string;
  clothImagePath?: string;
}

export function toClothItem(item: { price: Prisma.Decimal; createdAt: Date; updatedAt: Date } & Omit<ClothItem, 'price' | 'createdAt' | 'updatedAt'>): ClothItem {
  return {
    ...item,
    price: Number(item.price),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}