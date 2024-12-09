import sha1 from 'sha1';
import dbClient from '../utils/db';

export default async function postNew(req, res) {
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
  // return the user with email and id with status code 201
  return res.status(201).json(insertedUser);
}
