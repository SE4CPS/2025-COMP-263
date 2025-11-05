// index.js
const express = require('express');
const mongoose = require('mongoose');
const { createClient } = require('redis');

const app = express();

// ===== MongoDB Connection =====
const mongoURI = "mongodb+srv://i40:dbms2@cluster0.lixbqmp.mongodb.net/AgriDB?retryWrites=true&w=majority";
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.connection.on('connected', () => {
  console.log('✅ Connected to MongoDB Atlas (AgriDB)');
});

// ===== Redis Connection =====
const redisClient = createClient();
redisClient.on('error', (err) => console.log('Redis Client Error', err));

(async () => {
  await redisClient.connect();
  console.log('✅ Connected to Redis');
})();

app.get('/', (req, res) => {
  res.send('Node server connected to Redis & MongoDB Atlas!');
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
