package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var client *mongo.Client
var readingsCollection *mongo.Collection

type Reading struct {
	DeviceID   string    `json:"deviceId" bson:"deviceId"`
	FarmID     string    `json:"farmId" bson:"farmId"`
	Sensor     Sensor    `json:"sensor" bson:"sensor"`
	GPS        GPS       `json:"gps" bson:"gps"`
	Note       string    `json:"note" bson:"note"`
	Timestamp  string    `json:"timestamp" bson:"timestamp"`
	IngestedAt time.Time `json:"ingestedAt" bson:"ingestedAt"`
}

type Sensor struct {
	TempC    float64 `json:"tempC" bson:"tempC"`
	Moisture float64 `json:"moisture" bson:"moisture"`
	Humidity float64 `json:"humidity" bson:"humidity"`
}

type GPS struct {
	Lat float64 `json:"lat" bson:"lat"`
	Lon float64 `json:"lon" bson:"lon"`
}

type StatsResponse struct {
	FarmID          string    `json:"farmId"`
	TotalReadings   int64     `json:"totalReadings"`
	AvgTemperature  float64   `json:"avgTemperature"`
	AvgMoisture     float64   `json:"avgMoisture"`
	AvgHumidity     float64   `json:"avgHumidity"`
	LastReadingTime time.Time `json:"lastReadingTime"`
}

func main() {
	// Connect to MongoDB
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	mongoURI := "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/"
	var err error
	client, err = mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatal(err)
	}
	defer client.Disconnect(ctx)

	// Ping the database
	err = client.Ping(ctx, nil)
	if err != nil {
		log.Fatal(err)
	}
	log.Println("Connected to MongoDB Atlas!")

	// Get collection
	readingsCollection = client.Database("Project1").Collection("Readings")

	// Setup routes
	http.HandleFunc("/readings", handleReadings)
	http.HandleFunc("/stats/basic", handleStatsBasic)

	// Start server
	log.Println("Server starting on port 8081...")
	log.Fatal(http.ListenAndServe(":8081", nil))
}

// POST /readings - Insert a new reading
// GET /readings?since=...&limit=... - Query recent readings
func handleReadings(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	switch r.Method {
	case "POST":
		handlePostReading(w, r)
	case "GET":
		handleGetReadings(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func handlePostReading(w http.ResponseWriter, r *http.Request) {
	var reading Reading
	err := json.NewDecoder(r.Body).Decode(&reading)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Set ingestedAt to current time
	reading.IngestedAt = time.Now().UTC()

	// Validate GPS coordinates
	if reading.GPS.Lat < -90 || reading.GPS.Lat > 90 {
		http.Error(w, "Invalid latitude: must be between -90 and 90", http.StatusBadRequest)
		return
	}
	if reading.GPS.Lon < -180 || reading.GPS.Lon > 180 {
		http.Error(w, "Invalid longitude: must be between -180 and 180", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if reading.DeviceID == "" || reading.FarmID == "" || reading.Timestamp == "" {
		http.Error(w, "Missing required fields: deviceId, farmId, or timestamp", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	result, err := readingsCollection.InsertOne(ctx, reading)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"message": "Reading inserted successfully",
		"id":      result.InsertedID,
	}
	json.NewEncoder(w).Encode(response)
}

func handleGetReadings(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters
	sinceStr := r.URL.Query().Get("since")
	limitStr := r.URL.Query().Get("limit")

	// Default limit
	limit := int64(100)
	if limitStr != "" {
		parsedLimit, err := strconv.ParseInt(limitStr, 10, 64)
		if err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	// Build filter
	filter := bson.M{}
	if sinceStr != "" {
		filter["timestamp"] = bson.M{"$gte": sinceStr}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Query with sort by timestamp descending
	opts := options.Find().SetLimit(limit).SetSort(bson.D{{Key: "timestamp", Value: -1}})
	cursor, err := readingsCollection.Find(ctx, filter, opts)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer cursor.Close(ctx)

	var readings []Reading
	if err = cursor.All(ctx, &readings); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(readings)
}

// GET /stats/basic?farmId=... - Return counts, averages, and last reading timestamp
func handleStatsBasic(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	farmID := r.URL.Query().Get("farmId")
	if farmID == "" {
		http.Error(w, "farmId parameter is required", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	filter := bson.M{"farmId": farmID}

	// Count total readings
	count, err := readingsCollection.CountDocuments(ctx, filter)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Calculate averages using aggregation
	pipeline := []bson.M{
		{"$match": filter},
		{"$group": bson.M{
			"_id":           nil,
			"avgTemp":       bson.M{"$avg": "$sensor.tempC"},
			"avgMoisture":   bson.M{"$avg": "$sensor.moisture"},
			"avgHumidity":   bson.M{"$avg": "$sensor.humidity"},
			"lastTimestamp": bson.M{"$max": "$timestamp"},
		}},
	}

	cursor, err := readingsCollection.Aggregate(ctx, pipeline)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer cursor.Close(ctx)

	var results []bson.M
	if err = cursor.All(ctx, &results); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	stats := StatsResponse{
		FarmID:        farmID,
		TotalReadings: count,
	}

	if len(results) > 0 {
		result := results[0]
		if avgTemp, ok := result["avgTemp"].(float64); ok {
			stats.AvgTemperature = avgTemp
		}
		if avgMoisture, ok := result["avgMoisture"].(float64); ok {
			stats.AvgMoisture = avgMoisture
		}
		if avgHumidity, ok := result["avgHumidity"].(float64); ok {
			stats.AvgHumidity = avgHumidity
		}
		if lastTime, ok := result["lastTimestamp"].(string); ok {
			if parsedTime, err := time.Parse(time.RFC3339, lastTime); err == nil {
				stats.LastReadingTime = parsedTime
			}
		}
	}

	json.NewEncoder(w).Encode(stats)
}
