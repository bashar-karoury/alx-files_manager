import sha1 from 'sha1';
import Queue from 'bull';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

export async function postNew(req, res) {
  // get email and password
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Missing email' });
  }
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Missing password' });
  }

  // check if email already exists in db
  const usersWithSameEmail = await dbClient.findUserByEmail(email);
  if (usersWithSameEmail) {
    return res.status(400).json({ error: 'Already exist' });
  }

  // store the password after hashing it using sha1
  const hashedPassword = sha1(password);
  const insertedUser = await dbClient.addUser(email, hashedPassword);
  // delete the password key from the insertedUser object
  delete insertedUser.password;

  // update the key name from _id to id
  insertedUser.id = insertedUser._id;
  delete insertedUser._id;
  console.log(insertedUser);
  // enqueu job to send welcome email to user
  console.log('enquing users job ...');
  const userQueue = new Queue('userQueue', 'redis://127.0.0.1:6379');
  // add thumbnail job to queue
  await userQueue.add({ userId: insertedUser.id });
  // return the user with email and id with status code 201
  return res.status(201).json(insertedUser);
}

export async function getMe(req, res) {
  const token = req.headers['x-token'];
  if (!token) {
    console.error('No token header');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const key = `auth_${token}`;
  const userId = await redisClient.get(key);
  console.log(`key = ${key}`);
  console.log(`keyID = ${userId}`);

  if (!userId) {
    console.error('No token in cache');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const user = await dbClient.findUserById(userId);
  delete user.password;

  // update the key name from _id to id
  user.id = user._id;
  delete user._id;
  console.log('user', user);
  return res.status(200).json(user);
}
