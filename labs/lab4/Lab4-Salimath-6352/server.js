const express = require('express')
const mongoose = require('mongoose')
const { createClient } = require('redis')
require('dotenv').config()

const app = express()
app.use(express.json())

// log all requests
app.use((req, res, next) => {
  console.log(`➡️  ${req.method} ${req.url}`)
  next()
})

app.get('/', (req, res) => {
  res.send('✅ Server is working and ready!')
  console.log("hey I'm workking")
})

mongoose.connect('mongodb+srv://i40:dbms2@cluster0.lixbqmp.mongodb.net/AgriDB')
mongoose.connection.once('open', () => console.log('✅ MongoDB Connected'))

const redisClient = createClient()
redisClient.on('error', err => console.error('❌ Redis Error:', err))
redisClient.on('connect', () => console.log('✅ Redis Connected'))
redisClient.connect()

const readingSchema = new mongoose.Schema({
  sensorId: String,
  reading: Number,
  unit: String,
  updatedAt: Date,
  meta: { author: String }
})
const Reading = mongoose.model('Reading', readingSchema)

app.get('/cache-aside/:sensorId', async (req, res) => {
  const id = req.params.sensorId
  const cacheKey = `reading:${id}`
  console.log(`👉 Request for sensorId: ${id}`)

  try {
    let cached = await redisClient.get(cacheKey)
    if (cached) {
      console.log('🟢 Cache Hit (Cache-Aside)')
      return res.json(JSON.parse(cached))
    }

    console.log('🔴 Cache Miss (Cache-Aside)')
    const data = await Reading.findOne({ sensorId: id })
    if (!data) return res.status(404).send('No data found for this sensorId')

    await redisClient.set(cacheKey, JSON.stringify(data))
    console.log('✅ Stored in cache')
    res.json(data)
  } catch (err) {
    console.error('❌ Error:', err)
    res.status(500).send('Server Error')
  }
})
// ------------------ 2️⃣ READ-THROUGH ------------------
app.get('/read-through/:sensorId', async (req, res) => {
  const id = req.params.sensorId
  const cacheKey = `readthrough:${id}`
  console.log(`👉 Read-Through request for sensorId: ${id}`)

  try {
    let cached = await redisClient.get(cacheKey)
    if (cached) {
      console.log('🟢 Cache Hit (Read-Through)')
      return res.json(JSON.parse(cached))
    }

    console.log('🔴 Cache Miss (Read-Through) → fetching from MongoDB')
    const data = await Reading.findOne({ sensorId: id })
    if (!data) return res.status(404).send('No data found for this sensorId')

    // Store fetched data in Redis
    await redisClient.set(cacheKey, JSON.stringify(data))
    console.log('✅ Stored in cache (Read-Through)')
    res.json(data)
  } catch (err) {
    console.error('❌ Error:', err)
    res.status(500).send('Server Error')
  }
})


// ------------------ 3️⃣ EXPIRATION-BASED (TTL) ------------------
app.get('/ttl/:sensorId', async (req, res) => {
  const id = req.params.sensorId
  const cacheKey = `ttl:${id}`
  console.log(`👉 TTL request for sensorId: ${id}`)

  try {
    let cached = await redisClient.get(cacheKey)
    if (cached) {
      console.log('🟢 Cache Hit (TTL)')
      return res.json(JSON.parse(cached))
    }

    console.log('🔴 Cache Miss (TTL) → fetching from MongoDB and caching with 10s expiration')
    const data = await Reading.findOne({ sensorId: id })
    if (!data) return res.status(404).send('No data found for this sensorId')

    // Cache data for 10 seconds
    await redisClient.setEx(cacheKey, 10, JSON.stringify(data))
    console.log('✅ Stored in cache with TTL=10s')
    res.json(data)
  } catch (err) {
    console.error('❌ Error:', err)
    res.status(500).send('Server Error')
  }
})


app.listen(3001, () => console.log('🚀 Server running on http://localhost:3001'))
