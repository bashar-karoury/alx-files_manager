import { MongoClient } from 'mongodb';

const { ObjectId } = require('mongodb');

class DBClient {
  constructor() {
    // get env variables
    this.host = process.env.DB_HOST || 'localhost';
    this.port = process.env.DB_PORT || 27017;
    this.database = process.env.DB_DATABASE || 'files_manager';
    this.uri = `mongodb://${this.host}:${this.port}`;
    this.client = new MongoClient(this.uri);
  }

  async init() {
    // connect the db
    console.log('init connecting database');
    try {
      await this.client.connect();
      this.db = this.client.db(this.database);
    } catch (err) {
      console.error('Cant connect to database');
    }
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

  async findUserByEmail(email) {
    const collection = this.db.collection('users');
    const user = await collection.findOne({ email });
    return user;
  }

  async findUserById(id) {
    const collection = this.db.collection('users');
    const user = await collection.findOne({ _id: new ObjectId(id) });
    return user;
  }

  async addUser(email, password) {
    const collection = this.db.collection('users');
    const result = await collection.insertOne({ email, password });
    return result.ops[0];
  }

  async findFileById(id) {
    console.log('passed id ', id);
    const collection = this.db.collection('files');
    const user = await collection.findOne({ _id: new ObjectId(id) });
    return user;
  }

  async addFile(file) {
    const collection = this.db.collection('files');
    const result = await collection.insertOne(file);
    return result.ops[0];
  }

  async findFilesByUserIdAndParentId(userId, parentId, skip, pageSize) {
    const collection = this.db.collection('files');
    const result = await collection.aggregate([
      {
        $match: {
          userId: new ObjectId(userId),
          parentId: new ObjectId(parentId),
        },
      },
      { $skip: skip },
      { $limit: pageSize },
    ]).toArray();
    result.forEach((element) => {
      // eslint-disable-next-line no-param-reassign
      element.id = element._id;
      // eslint-disable-next-line no-param-reassign
      delete element._id;
      // eslint-disable-next-line no-param-reassign
      delete element.password;
    });
    return result;
  }

  async findFilesByUserIdAndId(userId, id) {
    const collection = this.db.collection('files');
    const result = await collection.aggregate([
      {
        $match: {
          userId: new ObjectId(userId),
          _id: new ObjectId(id),
        },
      },
    ]).toArray();
    console.log(result);
    return result[0];
  }

  async updateFile(id, update) {
    const collection = this.db.collection('files');
    let result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: update },
    );
    result = await this.findFileById(id);
    return result;
  }
}
// eslint-disable-next-line import/no-mutable-exports
const dbClient = new DBClient();
(async () => {
  await dbClient.init();
})();
export default dbClient;
