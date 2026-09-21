import { prisma } from '../db/prisma.js';
import { ClothItem, CreateClothItemDto, UpdateClothItemDto, toClothItem } from '../types.js';

export async function createItem(data: CreateClothItemDto): Promise<ClothItem> {
  const item = await prisma.clothItem.create({
    data: {
      ...data,
      price: Number(data.price),
    },
  });
  return toClothItem(item);
}

export async function getItem(id: string): Promise<ClothItem | null> {
  const item = await prisma.clothItem.findUnique({
    where: { id },
  });
  return item ? toClothItem(item) : null;
}

export async function getAllItems(): Promise<ClothItem[]> {
  const items = await prisma.clothItem.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return items.map(toClothItem);
}

export async function updateItem(id: string, data: UpdateClothItemDto): Promise<ClothItem | null> {
  const item = await prisma.clothItem.update({
    where: { id },
    data: {
      ...data,
      price: data.price ? Number(data.price) : undefined,
    },
  });
  return toClothItem(item);
}

export async function deleteItem(id: string): Promise<boolean> {
  await prisma.clothItem.delete({
    where: { id },
  });
  return true;
}