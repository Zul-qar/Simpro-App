import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';

if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
  dotenv.config();
}

import userRoutes from './routes/userRoutes.js';
import prebuildRoutes from './routes/prebuildRoutes.js';
import catalogRoutes from './routes/catalogRoutes.js';
import quoteRoutes from './routes/quoteRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import startAllCrons from './cron/index.js';

const app = express();

startAllCrons();

app.use(express.json());
app.use(helmet());
app.use(compression());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning');
  next();
});

app.use('/user', userRoutes);
app.use('/prebuilds', prebuildRoutes);
app.use('/catalogs', catalogRoutes);
app.use('/quotes', quoteRoutes);
app.use('/jobs', jobRoutes);

app.use((error, req, res, next) => {
  console.log(error);
  const statusCode = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(statusCode).json({ message, data });
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then(result => {
    app.listen(process.env.PORT);
  })
  .catch(err => {
    console.log(err);
  });
