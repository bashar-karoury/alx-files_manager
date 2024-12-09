import { createClient } from 'redis';

class RedisClient {
  constructor() {
    this.client = createClient();
    this.client.on('connect', () => {});
    this.client.on('error', (err) => {
      console.error('Error', err);
    });
    this.client.connect();
  }

  isAlive() {
    return this.client.isOpen;
  }

  async get(key) {
    return this.client.get(key);
  }

  async set(key, value, duration) {
    this.client.set(key, value, { EX: duration });
  }

  async del(key) {
    this.client.del(key);
  }
}

const redisClient = new RedisClient();
export default redisClient;
