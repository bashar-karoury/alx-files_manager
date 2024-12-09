import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    // get env variables
    this.host = process.env.DB_HOST || 'localhost';
    this.port = process.env.DB_PORT || 27017;
    this.database = process.env.DB_DATABASE || 'files_manager';
    const uri = `mongodb://${this.host}:${this.port}`;
    this.client = new MongoClient(uri);
  }

  async init() {
    // connect the db
    await this.client.connect();
    this.db = this.client.db(this.database);
  }

  isAlive() {
    return this.client.isConnected();
  }

  async nbUsers() {
    const collection = this.db.collection('users');
    const count = await collection.countDocuments();
    return count;
  }

  async nbFiles() {
    const collection = this.db.collection('files');
    const count = await collection.countDocuments();
    return count;
  }
}
const dbClient = new DBClient();
dbClient.init();
export default dbClient;
