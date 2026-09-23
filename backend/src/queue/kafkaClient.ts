import { Kafka } from 'kafkajs';
import { config } from '../config.js';

const sasl = config.kafka.username && config.kafka.password
  ? { mechanism: 'scram-sha-256' as const, username: config.kafka.username, password: config.kafka.password }
  : undefined;

const useSsl = config.kafka.brokers.some(b => !b.includes('localhost') && !b.includes('127.0.0.1'));

export const kafka = new Kafka({
  clientId: config.kafka.clientId,
  brokers: config.kafka.brokers,
  ssl: useSsl,
  sasl,
  retry: {
    initialRetryTime: 100,
    retries: 8,
  },
});

export const producer = kafka.producer();
export const consumer = kafka.consumer({ groupId: config.kafka.groupId });