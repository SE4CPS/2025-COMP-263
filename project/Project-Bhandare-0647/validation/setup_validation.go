package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
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

	db := client.Database("Project1")
	
	// Add schema validation
	err = addSchemaValidation(ctx, db)
	if err != nil {
		log.Printf("Warning: Schema validation setup: %v\n", err)
		log.Println("Note: You may need to recreate the collection to apply validation")
	} else {
		log.Println("✓ Schema validation rules applied successfully!")
	}

	// Create indexes
	err = createIndexes(ctx, db)
	if err != nil {
		log.Fatal("Error creating indexes:", err)
	}
	log.Println("✓ Indexes created successfully!")

	fmt.Println("\n=== Setup Complete ===")
	fmt.Println("Schema validation enforces:")
	fmt.Println("  - Required fields: deviceId, farmId, timestamp")
	fmt.Println("  - GPS latitude: -90 to 90")
	fmt.Println("  - GPS longitude: -180 to 180")
	fmt.Println("  - Timestamp in ISO-8601 format")
	fmt.Println("\nIndexes created:")
	fmt.Println("  - timestamp (ascending)")
	fmt.Println("  - farmId (ascending)")
}

func addSchemaValidation(ctx context.Context, db *mongo.Database) error {
	// Define schema validation rules
	validator := bson.M{
		"$jsonSchema": bson.M{
			"bsonType": "object",
			"required": []string{"deviceId", "farmId", "timestamp"},
			"properties": bson.M{
				"deviceId": bson.M{
					"bsonType":    "string",
					"description": "Device ID is required and must be a string",
				},
				"farmId": bson.M{
					"bsonType":    "string",
					"description": "Farm ID is required and must be a string",
				},
				"timestamp": bson.M{
					"bsonType":    "date",
					"description": "Timestamp is required and must be in ISO-8601 date format",
				},
				"sensor": bson.M{
					"bsonType": "object",
					"properties": bson.M{
						"tempC": bson.M{
							"bsonType":    "double",
							"description": "Temperature in Celsius",
						},
						"moisture": bson.M{
							"bsonType":    "double",
							"description": "Moisture percentage",
						},
						"humidity": bson.M{
							"bsonType":    "double",
							"description": "Humidity percentage",
						},
					},
				},
				"gps": bson.M{
					"bsonType": "object",
					"required": []string{"lat", "lon"},
					"properties": bson.M{
						"lat": bson.M{
							"bsonType":    "double",
							"minimum":     -90,
							"maximum":     90,
							"description": "Latitude must be between -90 and 90",
						},
						"lon": bson.M{
							"bsonType":    "double",
							"minimum":     -180,
							"maximum":     180,
							"description": "Longitude must be between -180 and 180",
						},
					},
				},
				"note": bson.M{
					"bsonType":    "string",
					"description": "Optional note field",
				},
				"ingestedAt": bson.M{
					"bsonType":    "date",
					"description": "Time when reading was ingested",
				},
			},
		},
	}

	// Try to modify existing collection
	opts := options.CreateCollection().SetValidator(validator)
	err := db.RunCommand(ctx, bson.D{
		{Key: "collMod", Value: "Readings"},
		{Key: "validator", Value: validator},
		{Key: "validationLevel", Value: "moderate"}, // moderate allows existing docs that don't match
	}).Err()

	if err != nil {
		// If collection doesn't exist, create it with validation
		err = db.CreateCollection(ctx, "Readings", opts)
		if err != nil {
			return fmt.Errorf("failed to create collection with validation: %w", err)
		}
	}

	return nil
}

func createIndexes(ctx context.Context, db *mongo.Database) error {
	collection := db.Collection("Readings")

	// Create index on timestamp (ascending) for query performance
	timestampIndex := mongo.IndexModel{
		Keys: bson.D{{Key: "timestamp", Value: 1}},
		Options: options.Index().
			SetName("timestamp_1").
			SetBackground(true),
	}

	// Create index on farmId for stats queries
	farmIdIndex := mongo.IndexModel{
		Keys: bson.D{{Key: "farmId", Value: 1}},
		Options: options.Index().
			SetName("farmId_1").
			SetBackground(true),
	}

	// Create compound index for common queries
	compoundIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "farmId", Value: 1},
			{Key: "timestamp", Value: -1},
		},
		Options: options.Index().
			SetName("farmId_1_timestamp_-1").
			SetBackground(true),
	}

	indexNames, err := collection.Indexes().CreateMany(ctx, []mongo.IndexModel{
		timestampIndex,
		farmIdIndex,
		compoundIndex,
	})

	if err != nil {
		return fmt.Errorf("failed to create indexes: %w", err)
	}

	fmt.Printf("Created indexes: %v\n", indexNames)
	return nil
}
