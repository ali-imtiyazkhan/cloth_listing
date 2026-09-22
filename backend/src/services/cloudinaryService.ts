import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config.js';

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
  secure: true,
});

export async function uploadImage(
  buffer: Buffer,
  options: { folder?: string; publicId?: string; resourceType?: 'image' | 'raw' } = {}
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: options.folder || 'tryon',
      public_id: options.publicId,
      resource_type: options.resourceType || 'image',
      overwrite: true,
    };

    const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) return reject(error);
      if (!result) return reject(new Error('Upload failed'));
      resolve({ url: result.secure_url, publicId: result.public_id });
    });

    uploadStream.end(buffer);
  });
}

export async function deleteImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

export function getImageUrl(publicId: string, options: { width?: number; height?: number; crop?: string; quality?: string } = {}): string {
  return cloudinary.url(publicId, {
    secure: true,
    ...options,
  });
}

export function getOptimizedImageUrl(publicId: string): string {
  return cloudinary.url(publicId, {
    secure: true,
    fetch_format: 'auto',
    quality: 'auto',
  });
}