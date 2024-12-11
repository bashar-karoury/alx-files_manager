import { expect } from 'chai';
import { before, after } from 'mocha';
import sinon from 'sinon';
import redisClient from '../utils/redis';

describe('redisClient', () => {
  before(() => {
    sinon.stub(redisClient.client, 'on');
    sinon.stub(redisClient.client, 'GET').yields(null, 'value');
    sinon.stub(redisClient.client, 'SETEX').yields(null);
    sinon.stub(redisClient.client, 'DEL').yields(null);
  });

  after(() => {
    sinon.restore();
  });

  describe('isAlive', () => {
    it('should return true if the client is connected', () => {
      redisClient.isClientConnected = true;
      expect(redisClient.isAlive()).to.be.true;
    });

    it('should return false if the client is not connected', () => {
      redisClient.isClientConnected = false;
      expect(redisClient.isAlive()).to.be.false;
    });
  });

  describe('get', () => {
    it('should retrieve the value of a given key', async () => {
      const value = await redisClient.get('key');
      expect(value).to.equal('value');
    });
  });

  describe('set', () => {
    it('should store a key and its value along with an expiration time', async () => {
      await redisClient.set('key', 'value', 10);
      expect(redisClient.client.SETEX.calledWith('key', 10, 'value')).to.be.true;
    });
  });

  describe('del', () => {
    it('should remove the value of a given key', async () => {
      await redisClient.del('key');
      expect(redisClient.client.DEL.calledWith('key')).to.be.true;
    });
  });
});
