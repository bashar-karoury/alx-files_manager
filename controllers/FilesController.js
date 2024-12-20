import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import Queue from 'bull/lib/queue';
import mime from 'mime-types';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

export async function postUpload(req, res) {
  // retrieve the user from token
  const token = req.headers['x-token'];
  if (!token) {
    console.error('No token header');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const key = `auth_${token}`;
  const userId = await redisClient.get(key);

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const user = await dbClient.findUserById(userId);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const {
    name, type, data, isPublic = false,
  } = req.body;

  let { parentId } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Missing name' });
  }
  const acceptedTypes = ['file', 'folder', 'image'];
  if (!type || !acceptedTypes.includes(type)) {
    return res.status(400).json({ error: 'Missing type' });
  }
  if (type !== 'folder' && !data) {
    return res.status(400).json({ error: 'Missing data' });
  }

  if (parentId) {
    // find file with parentId
    const folder = await dbClient.findFileById(parentId);
    if (!folder) {
      return res.status(400).json({ error: 'Parent not found' });
    }
    if (folder.type !== 'folder') {
      return res.status(400).json({ error: 'Parent is not a folder' });
    }
  } else {
    parentId = 0;
  }

  if (type === 'folder') {
    const file = {
      userId, name, type, isPublic, parentId,
    };
    const fileToSave = {
      ...file,
      userId: dbClient.convertToObjectId(userId),
      parentId: parentId ? dbClient.convertToObjectId(parentId) : 0,
    };
    const fileSaved = await dbClient.addFile(fileToSave);
    fileSaved.id = fileSaved._id;
    delete fileSaved._id;
    delete fileSaved.password;
    console.log(fileSaved);
    return res.status(201).json(fileSaved);
  }

  const storingDir = process.env.FOLDER_PATH || '/tmp/files_manager';
  if (!fs.existsSync(storingDir)) {
    fs.mkdirSync(storingDir, { recursive: true });
  }

  const fileUUID = uuidv4();
  const filePath = path.join(storingDir, fileUUID);
  console.log(filePath);

  const fileData = Buffer.from(data, 'base64');
  fs.writeFileSync(filePath, fileData);

  const file = {
    userId,
    name,
    type,
    isPublic,
    parentId: parentId || 0,
    localPath: filePath,
  };

  const fileToSave = {
    ...file,
    userId: dbClient.convertToObjectId(userId),
    parentId: parentId ? dbClient.convertToObjectId(parentId) : 0,
  };
  const fileSaved = await dbClient.addFile(fileToSave);

  if (type === 'image') {
    console.log('enquing job ...');
    const fileQueue = new Queue('fileQueue', 'redis://127.0.0.1:6379');
    // add thumbnail job to queue
    await fileQueue.add({ userId, fileId: fileSaved._id });
  }

  fileSaved.id = fileSaved._id;
  delete fileSaved._id;
  delete fileSaved.password;

  return res.status(201).json(fileSaved);
}

export async function getShow(req, res) {
  // retrieve the user from token
  const token = req.headers['x-token'];
  if (!token) {
    console.error('No token header');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const key = `auth_${token}`;
  const userId = await redisClient.get(key);

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const user = await dbClient.findUserById(userId);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // get id parameter
  const { id } = req.params;
  if (!id) {
    return res.status(404).json({ error: 'Not found' });
  }
  let result = null;
  try {
    result = await dbClient.findFileById(id);
  } catch (err) {
    console.error('cant find file by id');
  }
  console.log('result = ', result);
  if (!result) {
    return res.status(404).json({ error: 'Not found' });
  }
  console.log('result.userId : ', result.userId);
  console.log('userId : ', userId);

  if (String(result.userId) !== String(userId)) {
    return res.status(404).json({ error: 'Not found' });
  }
  delete result.localPath;
  result.id = result._id;
  delete result._id;
  return res.status(200).json(result);
}

export async function getIndex(req, res) {
  // retrieve the user from token
  const token = req.headers['x-token'];
  if (!token) {
    console.error('No token header');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const key = `auth_${token}`;
  const userId = await redisClient.get(key);

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const user = await dbClient.findUserById(userId);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { parentId = 0, page = 0 } = req.query;

  const pageSize = 20;
  const skip = page * pageSize;
  let files = null;
  try {
    console.log('userId : ', userId);
    console.log('parentId : ', parentId);
    files = await dbClient.findFilesByUserIdAndParentId(userId, parentId, skip, pageSize);
  } catch (err) {
    console.error('No files');
  }

  if (!files) {
    return res.status(400).json({ error: 'Not Found' });
  }
  files.forEach((file) => {
    // eslint-disable-next-line no-param-reassign
    delete file.localPath;
  });
  console.log(files);
  return res.status(200).json(files);
}

export async function putPublish(req, res) {
  // retrieve the user from token
  const token = req.headers['x-token'];
  if (!token) {
    console.error('No token header');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const key = `auth_${token}`;
  const userId = await redisClient.get(key);

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const user = await dbClient.findUserById(userId);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { id } = req.params;
  let file = null;
  try {
    file = await dbClient.findFilesByUserIdAndId(userId, id);
  } catch (err) {
    console.error('error finding file');
  }
  if (!file) {
    return res.status(404).json({ error: 'Not found' });
  }
  // update isPublic to true
  const update = { isPublic: true };
  file = await dbClient.updateFile(id, update);
  file.id = file._id;
  delete file._id;
  delete file.localPath;
  return res.status(200).json(file);
}

export async function putUnpublish(req, res) {
  // retrieve the user from token
  const token = req.headers['x-token'];
  if (!token) {
    console.error('No token header');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const key = `auth_${token}`;
  const userId = await redisClient.get(key);

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const user = await dbClient.findUserById(userId);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { id } = req.params;

  let file = await dbClient.findFilesByUserIdAndId(userId, id);
  if (!file) {
    return res.status(404).json({ error: 'Not found' });
  }
  // update isPublic to true
  const update = { isPublic: false };
  file = await dbClient.updateFile(id, update);
  file.id = file._id;
  delete file._id;
  delete file.localPath;
  return res.status(200).json(file);
}

export async function getFile(req, res) {
  // retrieve the user from token
  let userAuthenticated = false;
  let userId = null;
  const token = req.headers['x-token'];
  if (!token) {
    console.error('No token header');
  } else {
    const key = `auth_${token}`;
    userId = await redisClient.get(key);
    if (userId) {
      const user = await dbClient.findUserById(userId);
      if (user) {
        userAuthenticated = true;
      }
    }
  }

  const { id } = req.params;

  const file = await dbClient.findFileById(id);
  if (!file) {
    return res.status(404).json({ error: 'Not found' });
  }

  if (!file.isPublic && (!userAuthenticated || (String(userId) !== String(file.userId)))) {
    return res.status(404).json({ error: 'Not found' });
  }
  // check if type of file is folder
  if (file.type === 'folder') {
    return res.status(400).json({ error: "A folder doesn't have content" });
  }
  // check if file exist locally
  let { localPath } = file;
  if (!fs.existsSync(localPath)) {
    console.error("file doesn't exist");
    return res.status(404).json({ error: 'Not found' });
  }

  const mimeType = mime.lookup(file.name);

  res.setHeader('Content-Type', mimeType);

  if (file.type === 'image') {
    // get size query
    const { size } = req.query;
    console.log('size ', size);
    if (size) {
      // update local path
      const sizePath = `${localPath}_${size}`;
      if (fs.existsSync(sizePath)) {
        localPath = sizePath;
      } else {
        return res.status(404).json({ error: 'Not found' });
      }
    }
  }
  console.log('localPath ', localPath);
  const fileContent = fs.readFileSync(localPath);
  return res.status(200).send(fileContent);
}
