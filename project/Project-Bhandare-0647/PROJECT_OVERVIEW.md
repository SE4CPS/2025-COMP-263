# Project Overview - IoT MongoDB System

## 📋 What This Project Does

This is a complete IoT data collection system built with Go and MongoDB Atlas that:
- Stores sensor readings from IoT devices on farms
- Provides REST API endpoints to insert and query data
- Implements data validation and performance indexes
- Includes comprehensive testing utilities

## 📁 Complete File Structure

```
project1-iot-mongodb/
├── server.go              ⚙️  Main API server with all endpoints
├── seed.go               🌱  Script to populate database with 50+ readings
├── setup_validation.go   ✅  Script to add validation rules and indexes
├── test_api.sh          🧪  Shell script to test all API endpoints
├── go.mod               📦  Go module dependencies
├── Makefile             🔨  Easy command shortcuts
├── README.md            📖  Comprehensive documentation
├── QUICKSTART.md        🚀  Step-by-step setup guide
└── .gitignore           🚫  Git ignore rules
```

## 🎯 Assignment Question Mapping

### Question 1: MongoDB Compass Connection
**What to do:**
1. Download MongoDB Compass
2. Connect with: `mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/`
3. Navigate to Project1 → Readings
4. **Screenshot**: Show successful connection

### Question 2: Seed Database with Sample Data
**Files used:** `seed.go`
**Command:** `go run seed.go` OR `make seed`
**What it does:** Inserts 50+ IoT readings with realistic data
**Screenshot:** MongoDB Compass showing the 50+ documents in Readings collection

### Question 3: Implement API Endpoints
**Files used:** `server.go`, `test_api.sh`
**Commands:**
```bash
# Terminal 1
go run server.go

# Terminal 2
./test_api.sh
```
**Endpoints implemented:**
- POST /readings → Insert new reading
- GET /readings?since=...&limit=... → Query readings
- GET /stats/basic?farmId=... → Get farm statistics

**Screenshot:** Show successful responses for all 3 endpoints

### Question 4: Add Validation and Indexes
**Files used:** `setup_validation.go`
**Command:** `go run setup_validation.go` OR `make validate`
**What it adds:**
- Schema validation (required fields, GPS ranges, timestamp format)
- Performance indexes on timestamp and farmId

**Screenshot:** MongoDB Compass showing validation rules AND indexes

### Question 5: Submit to GitHub
**What to do:**
1. Clone: `git clone https://github.com/SE4CPS/2025-COMP-263.git`
2. Create folder: `project1-yourlastname-1234`
3. Copy all files to this folder
4. Push to GitHub

**Screenshot:** Your GitHub repo page showing folder structure

## 🚀 Quick Start (Choose One Method)

### Method 1: Using Makefile (Easiest!)
```bash
make install    # Install dependencies
make seed       # Populate database
make validate   # Setup validation & indexes
make server     # Start server (keep running)
make test       # Test endpoints (new terminal)
```

### Method 2: Manual Commands
```bash
# Setup
go mod download
go run seed.go
go run setup_validation.go

# Run server
go run server.go

# Test (in new terminal)
chmod +x test_api.sh
./test_api.sh
```

## 🔑 Key Features

### 1. Data Model
Each IoT reading contains:
```json
{
  "deviceId": "sensor-001",
  "farmId": "farm-01",
  "sensor": {
    "tempC": 24.5,
    "moisture": 65.3,
    "humidity": 78.2
  },
  "gps": {
    "lat": 40.7128,
    "lon": -74.0060
  },
  "note": "Normal reading",
  "timestamp": "2025-10-23T12:00:00Z",
  "ingestedAt": "2025-10-23T12:00:05Z"
}
```

### 2. Schema Validation
- ✅ Required: deviceId, farmId, timestamp
- ✅ GPS latitude: -90 to 90
- ✅ GPS longitude: -180 to 180
- ✅ Timestamp: ISO-8601 UTC format

### 3. Performance Indexes
- timestamp (ascending) - for time-based queries
- farmId (ascending) - for farm-specific queries
- farmId + timestamp (compound) - for combined queries

### 4. API Endpoints

**POST /readings**
- Insert new IoT reading
- Validates GPS coordinates
- Validates required fields
- Auto-sets ingestedAt timestamp

**GET /readings**
- Query recent readings
- Filter by timestamp (since parameter)
- Limit results (limit parameter)
- Sorted by timestamp (newest first)

**GET /stats/basic**
- Get statistics for a specific farm
- Returns: total count, averages, last reading time
- Uses MongoDB aggregation for efficiency

## 🧪 Testing Examples

### Insert a Reading
```bash
curl -X POST http://localhost:8080/readings \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "sensor-001",
    "farmId": "farm-01",
    "sensor": {"tempC": 22.5, "moisture": 65.3, "humidity": 78.2},
    "gps": {"lat": 40.7128, "lon": -74.0060},
    "note": "Test reading",
    "timestamp": "2025-10-23T10:30:00Z"
  }'
```

### Query Recent Readings
```bash
curl "http://localhost:8080/readings?limit=10"
curl "http://localhost:8080/readings?since=2025-10-20T00:00:00Z&limit=20"
```

### Get Farm Statistics
```bash
curl "http://localhost:8080/stats/basic?farmId=farm-01"
```

## 📊 Sample Data Generated

The seed script creates realistic data:
- **Devices**: sensor-001 through sensor-005
- **Farms**: farm-01, farm-02, farm-03
- **Temperature**: 15-35°C
- **Moisture**: 20-80%
- **Humidity**: 30-90%
- **GPS**: Realistic coordinates in North America
- **Timestamps**: Spread over last 30 days

## 🔧 Technical Stack

- **Language**: Go 1.21+
- **Database**: MongoDB Atlas
- **Driver**: Official MongoDB Go Driver v1.13.1
- **API**: Standard Go HTTP server (net/http)
- **Testing**: Shell script with curl

## 💡 Code Highlights

### Server Architecture
- Clean separation of concerns
- Context-based MongoDB operations
- Proper error handling
- JSON encoding/decoding
- Query parameter parsing

### Validation
- Application-level validation in Go
- Database-level schema validation in MongoDB
- GPS coordinate range checking
- Required field verification

### Performance
- Indexes for fast queries
- Background index creation
- Efficient MongoDB aggregation pipelines
- Limited result sets to prevent overload

## 📚 Documentation Files

1. **README.md** - Comprehensive guide with all details
2. **QUICKSTART.md** - Fast setup guide
3. **This file** - Project overview and mapping

## ✅ Final Checklist

Before submission, ensure you have:
- [ ] MongoDB Compass screenshot (Q1)
- [ ] 50+ readings in database screenshot (Q2)
- [ ] All 3 API endpoints working screenshots (Q3)
- [ ] Validation and indexes screenshot (Q4)
- [ ] GitHub repository screenshot (Q5)
- [ ] All code files in proper folder structure
- [ ] Folder named: `project1-yourlastname-1234`

## 🆘 Common Issues & Solutions

**"Package not found"**
→ Run: `go mod download`

**"Port 8080 in use"**
→ Change port in server.go or kill process

**"Connection timeout"**
→ Check internet, verify connection string

**"Validation not showing in Compass"**
→ Refresh Compass or reconnect

## 🎓 Learning Outcomes

This project demonstrates:
✅ MongoDB Atlas connection and operations
✅ RESTful API design and implementation
✅ Data validation (application + database level)
✅ Database indexing for performance
✅ CRUD operations in Go
✅ MongoDB aggregation pipelines
✅ Error handling and validation
✅ Testing and documentation

## 📞 Support

If you encounter issues:
1. Check the QUICKSTART.md guide
2. Review error messages carefully
3. Verify connection string is exact
4. Ensure MongoDB Compass is connected
5. Check that server is running on correct port

---

**Ready to start?** Open QUICKSTART.md and follow the steps!

**Good luck with your project! 🚀**
