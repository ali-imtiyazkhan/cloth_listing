import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 4000,
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    imageModel: process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image',
  },
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'tryon-app',
    topic: process.env.KAFKA_TOPIC || 'tryon-jobs',
    groupId: process.env.KAFKA_GROUP_ID || 'tryon-workers',
    username: process.env.KAFKA_USERNAME || '',
    password: process.env.KAFKA_PASSWORD || '',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  databaseUrl: process.env.DATABASE_URL || 'postgresql://tryon:tryon@localhost:5432/tryon',
  outputDir: process.env.OUTPUT_DIR || './generated',
  dummyImagePath: process.env.DUMMY_IMAGE_PATH || './assets/dummy.png',
  adminApiKey: process.env.ADMIN_API_KEY || 'your_admin_secret_key_here',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
};