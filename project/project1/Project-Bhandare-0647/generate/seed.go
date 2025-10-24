package main

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

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

func main() {
	// Seed random number generator
	rand.Seed(time.Now().UnixNano())

	// Connect to MongoDB
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	mongoURI := "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/"
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
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
	collection := client.Database("Project1").Collection("Readings")

	// Generate and insert 50 sample readings
	readings := generateSampleReadings(50)

	var documents []interface{}
	for _, reading := range readings {
		documents = append(documents, reading)
	}

	insertCtx, insertCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer insertCancel()

	result, err := collection.InsertMany(insertCtx, documents)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Successfully inserted %d readings!\n", len(result.InsertedIDs))

	// Print sample of inserted data
	fmt.Println("\nSample of inserted readings:")
	for i := 0; i < 3 && i < len(readings); i++ {
		fmt.Printf("\nReading %d:\n", i+1)
		fmt.Printf("  Device ID: %s\n", readings[i].DeviceID)
		fmt.Printf("  Farm ID: %s\n", readings[i].FarmID)
		fmt.Printf("  Temperature: %.2f°C\n", readings[i].Sensor.TempC)
		fmt.Printf("  Moisture: %.2f%%\n", readings[i].Sensor.Moisture)
		fmt.Printf("  Humidity: %.2f%%\n", readings[i].Sensor.Humidity)
		fmt.Printf("  GPS: (%.4f, %.4f)\n", readings[i].GPS.Lat, readings[i].GPS.Lon)
		fmt.Printf("  Timestamp: %s\n", readings[i].Timestamp)
	}
}

func generateSampleReadings(count int) []Reading {
	readings := make([]Reading, count)

	deviceIDs := []string{"sensor-001", "sensor-002", "sensor-003", "sensor-004", "sensor-005"}
	farmIDs := []string{"farm-01", "farm-02", "farm-03"}
	notes := []string{
		"Normal reading",
		"Slightly elevated temperature",
		"Optimal conditions",
		"Moisture level good",
		"Regular check",
		"Post-irrigation reading",
		"Morning reading",
		"Evening reading",
	}

	// Generate readings with timestamps spread over the last 30 days
	now := time.Now().UTC()

	for i := 0; i < count; i++ {
		// Random timestamp within last 30 days
		hoursAgo := rand.Intn(30 * 24)
		timestamp := now.Add(-time.Duration(hoursAgo) * time.Hour)

		readings[i] = Reading{
			DeviceID: deviceIDs[rand.Intn(len(deviceIDs))],
			FarmID:   farmIDs[rand.Intn(len(farmIDs))],
			Sensor: Sensor{
				TempC:    randomFloat(15.0, 35.0, 2), // 15-35°C
				Moisture: randomFloat(20.0, 80.0, 2), // 20-80%
				Humidity: randomFloat(30.0, 90.0, 2), // 30-90%
			},
			GPS: GPS{
				Lat: randomFloat(35.0, 45.0, 6),     // Approximate latitude range
				Lon: randomFloat(-120.0, -100.0, 6), // Approximate longitude range
			},
			Note:       notes[rand.Intn(len(notes))],
			Timestamp:  timestamp.Format(time.RFC3339),
			IngestedAt: now,
		}
	}

	return readings
}

// randomFloat generates a random float between min and max with specified decimal places
func randomFloat(min, max float64, decimals int) float64 {
	value := min + rand.Float64()*(max-min)
	multiplier := float64(1)
	for i := 0; i < decimals; i++ {
		multiplier *= 10
	}
	return float64(int(value*multiplier)) / multiplier
}
