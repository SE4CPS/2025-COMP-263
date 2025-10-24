# IoT MongoDB Project - COMP 263

This project implements an IoT data collection system using MongoDB Atlas and Go.

## Prerequisites

- Go 1.21 or higher
- MongoDB Compass (for visualization)
- Access to MongoDB Atlas cluster

## Project Structure

```
project1-lastname-id/
├── server.go              # Main API server
├── seed.go               # Script to populate database with sample data
├── setup_validation.go   # Script to add validation and indexes
├── test_api.sh          # Shell script to test API endpoints
├── go.mod               # Go module dependencies
└── README.md            # This file
```

## Setup Instructions

### 1. Install Dependencies

```bash
go mod download
```

### 2. Connect to MongoDB Atlas Using Compass

1. Download MongoDB Compass from: https://www.mongodb.com/try/download/compass
2. Open Compass and connect using this connection string:
   ```
   mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/
   ```
3. Once connected, navigate to:
   - Database: `Project1`
   - Collection: `Readings`
4. **📸 SCREENSHOT 1**: Take a screenshot showing successful connection with Project1 database and Readings collection visible

### 3. Seed Database with Sample Data

Run the seed script to insert 50 sample IoT readings:

```bash
go run seed.go
```

Expected output:
```
Connected to MongoDB Atlas!
Successfully inserted 50 readings!

Sample of inserted readings:
Reading 1:
  Device ID: sensor-001
  Farm ID: farm-01
  Temperature: 24.50°C
  ...
```

In MongoDB Compass:
- Refresh the Readings collection
- You should see 50+ documents

**📸 SCREENSHOT 2**: Take a screenshot from Compass showing the sample data in the Readings collection

### 4. Add Validation and Indexes

Run the validation setup script:

```bash
go run setup_validation.go
```

This will:
- Add schema validation rules (required fields, GPS coordinate ranges, timestamp format)
- Create indexes on `timestamp` and `farmId` fields

In MongoDB Compass:
- Click on the Readings collection
- Go to the "Validation" tab to see validation rules
- Go to the "Indexes" tab to see created indexes

**📸 SCREENSHOT 4**: Take a screenshot from Compass showing both the schema validation rules AND the indexes

### 5. Start API Server

```bash
go run server.go
```

Expected output:
```
Connected to MongoDB Atlas!
Server starting on port 8080...
```

### 6. Test API Endpoints

Open a new terminal and test each endpoint:

#### Test 1: POST /readings (Insert new reading)

```bash
curl -X POST http://localhost:8080/readings \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "sensor-test",
    "farmId": "farm-01",
    "sensor": {
      "tempC": 22.5,
      "moisture": 65.3,
      "humidity": 78.2
    },
    "gps": {
      "lat": 40.7128,
      "lon": -74.0060
    },
    "note": "Test reading from API",
    "timestamp": "2025-10-23T10:30:00Z"
  }'
```

Expected response:
```json
{
  "message": "Reading inserted successfully",
  "id": "..."
}
```

#### Test 2: GET /readings (Query recent readings)

```bash
# Get last 10 readings
curl "http://localhost:8080/readings?limit=10"

# Get readings since a specific date
curl "http://localhost:8080/readings?since=2025-10-01T00:00:00Z&limit=20"
```

#### Test 3: GET /stats/basic (Get statistics for a farm)

```bash
curl "http://localhost:8080/stats/basic?farmId=farm-01"
```

Expected response:
```json
{
  "farmId": "farm-01",
  "totalReadings": 18,
  "avgTemperature": 24.87,
  "avgMoisture": 52.34,
  "avgHumidity": 65.21,
  "lastReadingTime": "2025-10-23T08:45:00Z"
}
```

**📸 SCREENSHOT 3**: Take screenshots showing successful responses for ALL THREE endpoints (POST, GET readings, GET stats)

Alternatively, use the provided test script:
```bash
chmod +x test_api.sh
./test_api.sh
```

## API Endpoints Reference

### POST /readings
Insert a new IoT reading.

**Request Body:**
```json
{
  "deviceId": "sensor-001",
  "farmId": "farm-01",
  "sensor": {
    "tempC": 25.5,
    "moisture": 60.0,
    "humidity": 70.0
  },
  "gps": {
    "lat": 40.7128,
    "lon": -74.0060
  },
  "note": "Normal reading",
  "timestamp": "2025-10-23T12:00:00Z"
}
```

### GET /readings
Query recent readings with optional filters.

**Query Parameters:**
- `since` (optional): ISO-8601 timestamp to filter readings after this time
- `limit` (optional): Maximum number of readings to return (default: 100)

**Example:** `GET /readings?since=2025-10-20T00:00:00Z&limit=50`

### GET /stats/basic
Get statistics for a specific farm.

**Query Parameters:**
- `farmId` (required): Farm identifier

**Example:** `GET /stats/basic?farmId=farm-01`

**Response:**
```json
{
  "farmId": "farm-01",
  "totalReadings": 25,
  "avgTemperature": 24.5,
  "avgMoisture": 55.2,
  "avgHumidity": 68.7,
  "lastReadingTime": "2025-10-23T10:00:00Z"
}
```

## Schema Validation Rules

The collection enforces:
- **Required fields**: `deviceId`, `farmId`, `timestamp`
- **GPS coordinates**:
  - Latitude: -90 to 90
  - Longitude: -180 to 180
- **Timestamp format**: ISO-8601 UTC format

## Indexes

The following indexes are created for query performance:
- `timestamp` (ascending)
- `farmId` (ascending)
- `farmId` + `timestamp` (compound index for efficient farm-specific queries)

## Submitting to GitHub

1. Clone the class repository:
```bash
git clone https://github.com/SE4CPS/2025-COMP-263.git
cd 2025-COMP-263/project/project1
```

2. Create your project folder:
```bash
mkdir project1-lastname-1234
cd project1-lastname-1234
```
Replace:
- `lastname` with your last name
- `1234` with the last 4 digits of your student ID

3. Copy all project files into this folder

4. Commit and push:
```bash
git add .
git commit -m "Add Project 1 - IoT MongoDB"
git push
```

**📸 SCREENSHOT 5**: Take a screenshot of your GitHub repository page showing the code and folder structure

## Troubleshooting

### Connection Issues
- Ensure you're using the exact connection string provided
- Check your internet connection
- MongoDB Atlas may require IP whitelisting (contact instructor)

### Module Issues
If you get module errors, run:
```bash
go mod tidy
go mod download
```

### Port Already in Use
If port 8080 is in use, you can change it in `server.go`:
```go
log.Fatal(http.ListenAndServe(":8081", nil)) // Change to different port
```

## Project Checklist

- [ ] Question 1: Screenshot of Compass connected to Project1/Readings
- [ ] Question 2: Screenshot of 50+ sample readings in Compass
- [ ] Question 3: Screenshots of all 3 API endpoints working (POST, GET, GET stats)
- [ ] Question 4: Screenshot of validation rules and indexes in Compass
- [ ] Question 5: Screenshot of GitHub repository with code

## Author

[Your Name]  
Student ID: [Your ID]  
COMP 263 - Fall 2025
