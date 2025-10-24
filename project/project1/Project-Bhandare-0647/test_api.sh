#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

API_URL="http://localhost:8080"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Testing IoT MongoDB API${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Test 1: POST /readings
echo -e "${GREEN}Test 1: POST /readings (Insert new reading)${NC}"
echo "Request:"
echo '{
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

echo -e "\nResponse:"
curl -X POST $API_URL/readings \
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

echo -e "\n\n${BLUE}========================================${NC}\n"

# Test 2: GET /readings (with limit)
echo -e "${GREEN}Test 2: GET /readings?limit=5 (Get recent readings)${NC}"
echo "Request: GET $API_URL/readings?limit=5"
echo -e "\nResponse:"
curl "$API_URL/readings?limit=5"

echo -e "\n\n${BLUE}========================================${NC}\n"

# Test 3: GET /readings (with since parameter)
echo -e "${GREEN}Test 3: GET /readings?since=2025-10-01T00:00:00Z&limit=10${NC}"
echo "Request: GET $API_URL/readings?since=2025-10-01T00:00:00Z&limit=10"
echo -e "\nResponse:"
curl "$API_URL/readings?since=2025-10-01T00:00:00Z&limit=10"

echo -e "\n\n${BLUE}========================================${NC}\n"

# Test 4: GET /stats/basic
echo -e "${GREEN}Test 4: GET /stats/basic?farmId=farm-01 (Get farm statistics)${NC}"
echo "Request: GET $API_URL/stats/basic?farmId=farm-01"
echo -e "\nResponse:"
curl "$API_URL/stats/basic?farmId=farm-01"

echo -e "\n\n${BLUE}========================================${NC}\n"

# Test 5: GET /stats/basic for another farm
echo -e "${GREEN}Test 5: GET /stats/basic?farmId=farm-02${NC}"
echo "Request: GET $API_URL/stats/basic?farmId=farm-02"
echo -e "\nResponse:"
curl "$API_URL/stats/basic?farmId=farm-02"

echo -e "\n\n${BLUE}========================================${NC}\n"

# Test 6: POST with invalid GPS coordinates (should fail)
echo -e "${GREEN}Test 6: POST with invalid GPS coordinates (should fail)${NC}"
echo "Request with invalid latitude (100):"
echo -e "\nResponse:"
curl -X POST $API_URL/readings \
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
      "lat": 100,
      "lon": -74.0060
    },
    "note": "Invalid GPS test",
    "timestamp": "2025-10-23T10:30:00Z"
  }'

echo -e "\n\n${BLUE}========================================${NC}"
echo -e "${GREEN}All tests completed!${NC}"
echo -e "${BLUE}========================================${NC}\n"
