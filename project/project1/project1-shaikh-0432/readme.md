## 🔍 Validation & Index Setup

To ensure data integrity and performance, a JSON Schema validator and time-based indexes were defined for the **Readings** collection in MongoDB Atlas.

### Schema Validation (Design)
```json
{
  "$jsonSchema": {
    "bsonType": "object",
    "required": ["deviceId", "farmId", "timestamp"],
    "properties": {
      "deviceId": { "bsonType": "string" },
      "farmId": { "bsonType": "string" },
      "timestamp": {
        "bsonType": "string",
        "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d{3})?Z$"
      },
      "gps": {
        "bsonType": "object",
        "required": ["lat", "lon"],
        "properties": {
          "lat": { "bsonType": "number", "minimum": -90, "maximum": 90 },
          "lon": { "bsonType": "number", "minimum": -180, "maximum": 180 }
        }
      },
      "sensor": {
        "bsonType": "object",
        "properties": {
          "tempC": { "bsonType": "number" },
          "moisture": { "bsonType": "number" },
          "humidity": { "bsonType": "number" }
        }
      },
      "note": { "bsonType": "string" }
    }
  }
}
