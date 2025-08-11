const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const compression = require('compression');

const userRoutes = require('./routes/userRoutes');
const prebuildRoutes = require('./routes/prebuildRoutes');
const catalogRoutes = require('./routes/catalogRoutes');
const quoteRoutes = require('./routes/quoteRoutes');
const jobRoutes = require('./routes/jobRoutes');
const startAllCrons = require('./cron/index');

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
    app.listen(process.env.PORT || 3000);
  })
  .catch(err => {
    console.log(err);
  });
