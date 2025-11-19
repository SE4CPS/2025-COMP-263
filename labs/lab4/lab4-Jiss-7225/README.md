# Lab 4: Redis and MongoDB Caching Implementation

**Author:** Manu Mathew Jiss

## Project Overview

This project demonstrates various caching strategies using Redis and MongoDB Atlas. The application implements three caching patterns: Cache-Aside, Read-Through, and TTL-based expiration.

## Technologies Used

- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB Atlas** - Cloud database (AgriDB database with readings collection)
- **Redis** - In-memory caching
- **Mongoose** - MongoDB ODM

## Setup Instructions

### Prerequisites

- Node.js installed
- Redis running locally
- MongoDB Atlas account with connection URI

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with your MongoDB URI:
```
MONGODB_URI=your_mongodb_atlas_connection_string
```

3. Seed the database with 2,000 sample records:
```bash
npm run seed
```

4. Start the server:
```bash
npm start
```

Server will run on `http://localhost:3000`

## API Endpoints

### Caching Strategies

- **GET** `/cache-aside/:sensorId` - Cache-Aside pattern
- **GET** `/read-through/:sensorId` - Read-Through pattern
- **GET** `/ttl/:sensorId` - TTL/Expiration-Based pattern (30-second expiration)

### Utilities

- **GET** `/no-cache/:sensorId` - Direct MongoDB query without caching
- **GET** `/clear-cache` - Clear all Redis cache

### Example Usage

```bash
# Cache-Aside (first request - database)
curl http://localhost:3000/cache-aside/sensor-00001

# Cache-Aside (second request - cache hit)
curl http://localhost:3000/cache-aside/sensor-00001
```

## Performance Results

| Strategy | Without Cache | With Cache | Improvement |
|----------|---------------|------------|-------------|
| Cache-Aside | 93ms | 0ms | 93x faster |
| Read-Through | 82ms | 1ms | 82x faster |
| TTL | 89ms | 2ms | 44x faster |

## Database Structure

**Database:** AgriDB  
**Collection:** readings

**Document Schema:**
```json
{
  "sensorId": "sensor-00001",
  "reading": 51.07,
  "unit": "ppm",
  "updatedAt": "2025-10-09T20:47:42.194Z",
  "meta": {
    "author": "Manu Mathew Jiss"
  }
}
```

## Project Structure

```
lab4-redis-mongo/
├── index.js          # Main server file with caching endpoints
├── seed.js           # Database seeding script
├── package.json      # Dependencies and scripts
├── .env              # Environment variables (not included)
└── README.md         # Project documentation
```

## License

ISC

