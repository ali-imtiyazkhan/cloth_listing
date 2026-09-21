import Redis from 'ioredis';
import { config } from '../config.js';
import { ClothItem, CreateClothItemDto, UpdateClothItemDto } from '../types.js';

const redis = new (Redis as any)(config.redis.url, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => Math.min(times * 100, 3000),
});

const ITEM_KEY_PREFIX = 'cloth:item:';
const ITEMS_INDEX_KEY = 'cloth:items:index';
const ITEM_TTL_SECONDS = 30 * 24 * 60 * 60;

function itemKey(id: string): string {
  return `${ITEM_KEY_PREFIX}${id}`;
}

export async function createItem(data: CreateClothItemDto): Promise<ClothItem> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  const item: ClothItem = {
    id,
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  
  await redis.set(itemKey(id), JSON.stringify(item), 'EX', ITEM_TTL_SECONDS);
  await redis.sadd(ITEMS_INDEX_KEY, id);
  
  return item;
}

export async function getItem(id: string): Promise<ClothItem | null> {
  const data = await redis.get(itemKey(id));
  if (!data) return null;
  return JSON.parse(data) as ClothItem;
}

export async function getAllItems(): Promise<ClothItem[]> {
  const ids = await redis.smembers(ITEMS_INDEX_KEY);
  if (!ids.length) return [];
  
  const items = await Promise.all(
    ids.map((id: string) => getItem(id))
  );
  
  return items.filter((item): item is ClothItem => item !== null)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function updateItem(id: string, data: UpdateClothItemDto): Promise<ClothItem | null> {
  const existing = await getItem(id);
  if (!existing) return null;
  
  const updated: ClothItem = {
    ...existing,
    ...data,
    updatedAt: new Date().toISOString(),
  };
  
  await redis.set(itemKey(id), JSON.stringify(updated), 'EX', ITEM_TTL_SECONDS);
  return updated;
}

export async function deleteItem(id: string): Promise<boolean> {
  const existing = await getItem(id);
  if (!existing) return false;
  
  await redis.del(itemKey(id));
  await redis.srem(ITEMS_INDEX_KEY, id);
  return true;
}

export async function closeItemRedis(): Promise<void> {
  await redis.quit();
}