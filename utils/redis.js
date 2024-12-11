import { createClient } from 'redis';

class RedisClient {
  constructor() {
    this.client = createClient();
    this.client.on('connect', () => {});
    this.client.on('error', (err) => {
      console.error('Error', err);
    });
  }

  isAlive() {
    return this.client.isOpen;
  }

  async get(key) {
    await this.client.connect();
    const result = await this.client.get(key);
    return result;
  }

  async set(key, value, duration) {
    await this.client.connect();
    await this.client.set(key, value, { EX: duration });
  }

  async del(key) {
    await this.client.connect();
    await this.client.del(key);
  }
}

const redisClient = new RedisClient();

export default redisClient;
