import express from 'express';
import router from './routes/index';

const app = express();
const PORT = process.env.PORT || 5000;

// Use the routes
app.use('/', router); // All routes start with /
app.listen(PORT);
