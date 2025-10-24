# Quick Start Guide

## Step-by-Step Setup (5 minutes)

### 1. Download and Extract Files
All project files are ready to use. No modifications needed!

### 2. Install Go Dependencies
```bash
go mod download
```

### 3. Run Each Component

**A. Seed the Database (Question 2)**
```bash
go run seed.go
```
✓ This inserts 50 sample readings  
✓ Open MongoDB Compass to see the data  
✓ Take screenshot for Question 2

**B. Setup Validation & Indexes (Question 4)**
```bash
go run setup_validation.go
```
✓ Adds schema validation rules  
✓ Creates performance indexes  
✓ Check Compass → Validation & Indexes tabs  
✓ Take screenshot for Question 4

**C. Start API Server (Question 3)**
```bash
go run server.go
```
Keep this running in one terminal

**D. Test API (Question 3) - Open NEW terminal**
```bash
# Make test script executable
chmod +x test_api.sh

# Run all tests
./test_api.sh
```
✓ Tests all 3 endpoints  
✓ Take screenshots of responses  
✓ Complete Question 3

## MongoDB Compass Connection (Question 1)

1. Open MongoDB Compass
2. Paste connection string:
   ```
   mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/
   ```
3. Click Connect
4. Navigate to Project1 → Readings
5. Take screenshot for Question 1

## Manual API Testing (Alternative to test_api.sh)

### Test POST /readings
```bash
curl -X POST http://localhost:8080/readings \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "sensor-test",
    "farmId": "farm-01",
    "sensor": {"tempC": 22.5, "moisture": 65.3, "humidity": 78.2},
    "gps": {"lat": 40.7128, "lon": -74.0060},
    "note": "Test reading",
    "timestamp": "2025-10-23T10:30:00Z"
  }'
```

### Test GET /readings
```bash
curl "http://localhost:8080/readings?limit=10"
```

### Test GET /stats/basic
```bash
curl "http://localhost:8080/stats/basic?farmId=farm-01"
```

## GitHub Submission (Question 5)

```bash
# Clone repo
git clone https://github.com/SE4CPS/2025-COMP-263.git
cd 2025-COMP-263/project/project1

# Create your folder (replace with your info)
mkdir project1-lastname-1234
cd project1-lastname-1234

# Copy all files here
cp /path/to/your/files/* .

# Commit and push
git add .
git commit -m "Add Project 1 - IoT MongoDB"
git push
```

Take screenshot of your GitHub repo for Question 5.

## Screenshots Checklist

- [ ] Q1: Compass connected to Project1/Readings
- [ ] Q2: 50+ readings visible in Compass
- [ ] Q3: All 3 API endpoints working (POST, GET, GET stats)
- [ ] Q4: Validation rules AND indexes in Compass
- [ ] Q5: GitHub repository with your code

## Troubleshooting

**"cannot find module"**
```bash
go mod tidy
go mod download
```

**"port 8080 already in use"**
- Change port in server.go line 60: `:8081`
- Or kill process: `lsof -ti:8080 | xargs kill -9`

**Connection timeout**
- Check internet connection
- Verify connection string is exact
- Contact instructor about IP whitelisting

## Need Help?

All code is fully functional and tested. Just follow the steps above in order!

Good luck! 🚀
