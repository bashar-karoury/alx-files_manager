import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

export async function getConnect(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [email, password] = credentials.split(':');
  console.log(email, password);
  const userWithEmail = await dbClient.findUserByEmail(email);
  console.log('founded user by email = ', userWithEmail);
  if (!userWithEmail) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  console.log(`user_hashed_password = ${userWithEmail.password} , receieved password hash = ${sha1(password)}`);
  if (userWithEmail.password !== sha1(password)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // generate random number
  const token = uuidv4();
  const key = `auth_${token}`;
  console.log('key', key);
  await redisClient.set(key, userWithEmail._id.toString(), 24 * 60 * 60);

  return res.status(200).json({ token });
}

export async function getDisconnect(req, res) {
  const token = req.headers['x-token'];
  console.log('getDisconnect called');
  if (!token) {
    console.log('No token');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const key = `auth_${token}`;
  const userId = await redisClient.get(key);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // del key
  await redisClient.del(key);
  return res.status(204).end();
}
