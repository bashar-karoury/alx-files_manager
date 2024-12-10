import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
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

  let {
    name, type, data, parentId, isPublic = false,
  } = req.body;

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
    const fileSaved = await dbClient.addFile(file);
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

  const fileSaved = await dbClient.addFile(file);
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
  const result = await dbClient.findFileById(id);
  if (result.userId !== userId) {
    return res.status(404).json({ error: 'Not found' });
  }
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

  const files = await dbClient.findFilesByUserIdAndParentId(userId, parentId, skip, pageSize);
  console.log(files);
  return res.status(200).json(files);
}
