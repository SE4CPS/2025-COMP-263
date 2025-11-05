const mongoose = require('mongoose')

const uri = 'mongodb+srv://i40:dbms2@cluster0.lixbqmp.mongodb.net/AgriDB'

mongoose.connect(uri).then(() => console.log('✅ Connected to MongoDB'))

const readingSchema = new mongoose.Schema({
  sensorId: String,
  reading: Number,
  unit: String,
  updatedAt: Date,
  meta: { author: String }
})

const Reading = mongoose.model('Reading', readingSchema)

async function insertData() {
  const sampleData = []
  for (let i = 1; i <= 2000; i++) {
    sampleData.push({
      sensorId: 'sensor-' + Math.floor(Math.random() * 100),
      reading: (Math.random() * 100).toFixed(2),
      unit: 'Celsius',
      updatedAt: new Date(),
      meta: { author: 'Shreya' }
    })
  }

  await Reading.insertMany(sampleData)
  console.log('✅ 2000 records inserted successfully!')
  mongoose.connection.close()
}

insertData()
