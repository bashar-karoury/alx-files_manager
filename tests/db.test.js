import { expect } from 'chai';
import sinon from 'sinon';
import dbClient from '../utils/db';
const { ObjectId } = require('mongodb');

/* eslint-disable jest/valid-expect */
/* eslint-disable jest/no-disabled-tests */
/* eslint-disable jest/no-focused-tests */
/* eslint-disable jest/no-identical-title */
/* eslint-disable jest/prefer-to-have-length */
/* eslint-disable jest/valid-expect-in-promise */
/* eslint-disable */

// eslint-disable-next-line jest/lowercase-name
describe('DBClient', () => {
  // eslint-disable-next-line no-undef
  before(async () => {
    await dbClient.init();
  });
  afterEach(()=>{
    sinon.restore();
  })

  describe('isAlive', () => {
    // eslint-disable-next-line jest/prefer-expect-assertions
    it('should return true if the client is connected', () => {
      const isConnectedStub = sinon.stub(dbClient.client, 'isConnected').returns(true);
      expect(dbClient.isAlive()).to.be.true;
      isConnectedStub.restore();
    });

    // eslint-disable-next-line jest/prefer-expect-assertions
    it('should return false if the client is not connected', () => {
      const isConnectedStub = sinon.stub(dbClient.client, 'isConnected').returns(false);
      expect(dbClient.isAlive()).to.be.false;
      isConnectedStub.restore();
    });
  });

  describe('nbUsers', () => {

    it('should return the number of users', async () => {
      // Stub the db.collection and countDocuments methods
      const countDocumentsStub = sinon.stub().resolves(5);
      const collectionStub = sinon.stub(dbClient.db, 'collection').withArgs('users').returns({
        countDocuments: countDocumentsStub,
      });
  
      // Call the nbUsers method
      const count = await dbClient.nbUsers();
  
      // Assertions
      expect(count).to.equal(5); // Ensure the result matches the expected count
      expect(collectionStub.calledOnceWithExactly('users')).to.be.true; // Ensure 'users' collection is called
      expect(countDocumentsStub.calledOnce).to.be.true; // Ensure countDocuments was called once
    });

    afterEach(() => {
      sinon.restore();
    });
  });

  describe('nbFiles', () => {
    it('should return the number of files', async () => {
     // Stub the db.collection and countDocuments methods
     const countDocumentsStub = sinon.stub().resolves(5);
     const collectionStub = sinon.stub(dbClient.db, 'collection').withArgs('files').returns({
       countDocuments: countDocumentsStub,
     });
 
     // Call the nbUsers method
     const count = await dbClient.nbFiles();
 
     // Assertions
     expect(count).to.equal(5); // Ensure the result matches the expected count
     expect(collectionStub.calledOnceWithExactly('files')).to.be.true; // Ensure 'users' collection is called
     expect(countDocumentsStub.calledOnce).to.be.true; // Ensure countDocuments was called once
    });
  });

  describe('findUserByEmail', () => {
    it('should return a user by email', async () => {
      const user = { email: 'test@example.com', password: 'password' };
      const findOneStub = sinon.stub(dbClient.db.collection('users'), 'findOne').resolves(user);
      const result = await dbClient.findUserByEmail('test@example.com');
      expect(result.email).to.eql(user.email);
      expect(result.password).to.eql(user.password);
      findOneStub.restore();
      sinon.restore();
    });
  });

  describe('findUserById', () => {
    it('should return a user by id', async () => {
      const user = {_id: '507f1f77bcf86cd799439011', email: 'test@example.com', password: 'password' };
      const findOneStub = sinon.stub(dbClient.db.collection('users'), 'findOne').withArgs({ _id: new ObjectId(user._id) }).resolves(user);
      const result = await dbClient.findUserById('507f1f77bcf86cd799439011');
      console.log(result);
      expect(result).to.deep.equal(user);
      findOneStub.restore();
    });
  });

  describe('addUser', () => {
    it('should add a user and return the user', async () => {
      const user = { email: 'test@example.com', password: 'password' };
      const insertOneStub = sinon.stub(dbClient.db.collection('users'), 'insertOne').resolves({ ops: [user] });
      const result = await dbClient.addUser('test@example.com', 'password');
      expect(result.email).to.eql(user.email);
      expect(result.password).to.eql(user.password);
      insertOneStub.restore();
      sinon.restore();
    });
  });

  describe('findFileById', () => {
    it('should return a file by id', async () => {
      const file = { _id: '507f1f77bcf86cd799439011', name: 'file.txt' };
      const findOneStub = sinon.stub(dbClient.db.collection('files'), 'findOne').resolves(file);
      const result = await dbClient.findFileById('507f1f77bcf86cd799439011');
      expect(result).to.deep.equal(file);
      findOneStub.restore();
    });
  });

  describe('addFile', () => {
    it('should add a file and return the file', async () => {
      const file = { name: 'file.txt' };
      const insertOneStub = sinon.stub(dbClient.db.collection('files'), 'insertOne').resolves({ ops: [file] });
      const result = await dbClient.addFile(file);
      expect(result.name).to.eql(file.name);
      insertOneStub.restore();
    });
  });

  describe('findFilesByUserIdAndParentId', () => {
    it('should return files by userId and parentId', async () => {
      const files = [{ _id: '507f1f77bcf86cd799439011', name: 'file.txt' }];
      const aggregateStub = sinon.stub(dbClient.db.collection('files'), 'aggregate').returns({
        toArray: sinon.stub().resolves(files),
      });
      const result = await dbClient.findFilesByUserIdAndParentId('userId', 'parentId', 0, 10);
      expect(result).to.deep.equal(files);
      aggregateStub.restore();
    });
  });

  describe('findFilesByUserIdAndId', () => {
    it('should return a file by userId and id', async () => {
      const file = { _id: '507f1f77bcf86cd799439011', name: 'file.txt' };
      const aggregateStub = sinon.stub(dbClient.db.collection('files'), 'aggregate').returns({
        toArray: sinon.stub().resolves([file]),
      });
      const result = await dbClient.findFilesByUserIdAndId('userId', '507f1f77bcf86cd799439011');
      expect(result).to.deep.equal(file);
      aggregateStub.restore();
    });
  });

  describe('updateFile', () => {
    it('should update a file and return the updated file', async () => {
      const file = { _id: '507f1f77bcf86cd799439011', name: 'file.txt' };
      const updateOneStub = sinon.stub(dbClient.db.collection('files'), 'updateOne').resolves({ modifiedCount: 1 });
      const findOneStub = sinon.stub(dbClient, 'findFileById').resolves(file);
      const result = await dbClient.updateFile('507f1f77bcf86cd799439011', { name: 'newfile.txt' });
      expect(result).to.deep.equal(file);
      updateOneStub.restore();
      findOneStub.restore();
    });
  });
});