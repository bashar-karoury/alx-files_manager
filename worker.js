import Queue from 'bull/lib/queue';

import fs from 'fs';
import imageThumbnail from 'image-thumbnail';
import dbClient from './utils/db';

const fileQueue = new Queue('fileQueue', 'redis://127.0.0.1:6379');
fileQueue.process(async (job, done) => {
  console.log('processing job', job.data);
  if (!job.data.fileId) {
    throw (new Error('Missing fileId'));
  }
  if (!job.data.userId) {
    throw (new Error('Missing userId'));
  }
  const file = await dbClient.findFilesByUserIdAndId(job.data.userId, job.data.fileId);
  if (!file) {
    throw (new Error('File not found'));
  }
  try {
    console.log('Generating thumbnails ...');
    const thumbnail500 = await imageThumbnail(file.localPath, { width: 500 });
    const thumbnail250 = await imageThumbnail(file.localPath, { width: 250 });
    const thumbnail100 = await imageThumbnail(file.localPath, { width: 100 });

    const filePath500 = `${file.localPath}_500`;
    const filePath250 = `${file.localPath}_250`;
    const filePath100 = `${file.localPath}_100`;

    fs.writeFileSync(filePath500, thumbnail500);
    fs.writeFileSync(filePath250, thumbnail250);
    fs.writeFileSync(filePath100, thumbnail100);
    console.log('finished processing');
    done();
  } catch (err) {
    console.error(err);
    done(err);
  }
});
fileQueue.on('completed', (job) => {
  console.log(`File Job with id ${job.data.userId} has been completed`);
});

// Users queue

const userQueue = new Queue('userQueue', 'redis://127.0.0.1:6379');
userQueue.process(async (job, done) => {
  console.log('processing job', job.data);
  const { userId } = job.data;
  if (!userId) {
    throw (new Error('Missing userId'));
  }
  const user = await dbClient.findUserById(userId);
  if (!user) {
    throw (new Error('User not found'));
  }
  try {
    console.log(`Welcome ${user.email}!`);
    done();
  } catch (err) {
    console.error(err);
    done(err);
  }
});
userQueue.on('completed', (job) => {
  console.log(`User Job with id ${job.data.userId} has been completed`);
});
