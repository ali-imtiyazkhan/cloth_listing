import { producer } from './kafkaClient.js';
import { TryOnJob } from '../types.js';
import { config } from '../config.js';

let connected = false;

export async function enqueueTryOnJob(job: TryOnJob): Promise<void> {
  if (!connected) {
    await producer.connect();
    connected = true;
  }
  await producer.send({
    topic: config.kafka.topic,
    messages: [
      {
        key: job.jobId,
        value: JSON.stringify(job),
      },
    ],
  });
}

export async function disconnectProducer(): Promise<void> {
  if (connected) {
    await producer.disconnect();
    connected = false;
  }
}