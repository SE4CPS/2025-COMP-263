package main

import (
	"context"

	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Farm represents the farm data structure
type Farm struct {
	FarmName           string    `json:"farmname" bson:"farmname"`
	CorpName           string    `json:"corpname" bson:"corpname"`
	TimestampLastWater time.Time `json:"timestamplastwater" bson:"timestamplastwater"`
	Farmer             string    `json:"farmer" bson:"farmer"`
}

// FarmResponse represents the API response structure
type FarmResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Data    any    `json:"data,omitempty"`
}

// MongoDB connection variables
var (
	mongoClient    *mongo.Client
	farmCollection *mongo.Collection
	mongoURI       = "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/"
	dbName         = "farmdb"
	collectionName = "farms"
)

// Connect to MongoDB
func connectToMongoDB() error {
	clientOptions := options.Client().ApplyURI(mongoURI)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		return fmt.Errorf("failed to connect to MongoDB: %v", err)
	}

	// Test the connection
	err = client.Ping(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to ping MongoDB: %v", err)
	}

	mongoClient = client
	farmCollection = client.Database(dbName).Collection(collectionName)

	log.Println("Connected to MongoDB successfully!")
	return nil
}

// Close MongoDB connection
func disconnectMongoDB() {
	if mongoClient != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		mongoClient.Disconnect(ctx)
		log.Println("Disconnected from MongoDB")
	}
}

// Insert single farm record
func insertFarm(c *gin.Context) {
	var farm Farm

	if err := c.ShouldBindJSON(&farm); err != nil {
		c.JSON(http.StatusBadRequest, FarmResponse{
			Success: false,
			Message: fmt.Sprintf("Invalid JSON format: %v", err),
		})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	result, err := farmCollection.InsertOne(ctx, farm)
	if err != nil {
		c.JSON(http.StatusInternalServerError, FarmResponse{
			Success: false,
			Message: fmt.Sprintf("Failed to insert farm data: %v", err),
		})
		return
	}

	c.JSON(http.StatusCreated, FarmResponse{
		Success: true,
		Message: "Farm data inserted successfully",
		Data: map[string]interface{}{
			"insertedId": result.InsertedID,
			"farm":       farm,
		},
	})
}

// Insert multiple farm records
func insertMultipleFarms(c *gin.Context) {
	var farms []Farm

	if err := c.ShouldBindJSON(&farms); err != nil {
		c.JSON(http.StatusBadRequest, FarmResponse{
			Success: false,
			Message: fmt.Sprintf("Invalid JSON format: %v", err),
		})
		return
	}

	if len(farms) == 0 {
		c.JSON(http.StatusBadRequest, FarmResponse{
			Success: false,
			Message: "No farm data provided",
		})
		return
	}

	// Convert to interface slice for MongoDB
	documents := make([]interface{}, len(farms))
	for i, farm := range farms {
		documents[i] = farm
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	result, err := farmCollection.InsertMany(ctx, documents)
	if err != nil {
		c.JSON(http.StatusInternalServerError, FarmResponse{
			Success: false,
			Message: fmt.Sprintf("Failed to insert farm data: %v", err),
		})
		return
	}

	c.JSON(http.StatusCreated, FarmResponse{
		Success: true,
		Message: fmt.Sprintf("Successfully inserted %d farm records", len(result.InsertedIDs)),
		Data: map[string]interface{}{
			"insertedIds": result.InsertedIDs,
			"count":       len(result.InsertedIDs),
		},
	})
}

// Get all farms
func getAllFarms(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := farmCollection.Find(ctx, bson.M{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, FarmResponse{
			Success: false,
			Message: fmt.Sprintf("Failed to fetch farms: %v", err),
		})
		return
	}
	defer cursor.Close(ctx)

	var farms []Farm
	if err = cursor.All(ctx, &farms); err != nil {
		c.JSON(http.StatusInternalServerError, FarmResponse{
			Success: false,
			Message: fmt.Sprintf("Failed to decode farms: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, FarmResponse{
		Success: true,
		Message: "Farms retrieved successfully",
		Data:    farms,
	})
}

// Get farms by farmer name
func getFarmsByFarmer(c *gin.Context) {
	farmerName := c.Param("farmer")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	filter := bson.M{"farmer": farmerName}
	cursor, err := farmCollection.Find(ctx, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, FarmResponse{
			Success: false,
			Message: fmt.Sprintf("Failed to fetch farms: %v", err),
		})
		return
	}
	defer cursor.Close(ctx)

	var farms []Farm
	if err = cursor.All(ctx, &farms); err != nil {
		c.JSON(http.StatusInternalServerError, FarmResponse{
			Success: false,
			Message: fmt.Sprintf("Failed to decode farms: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, FarmResponse{
		Success: true,
		Message: fmt.Sprintf("Farms for farmer '%s' retrieved successfully", farmerName),
		Data:    farms,
	})
}

// Insert sample data from your artifact
func insertSampleData(c *gin.Context) {
	sampleFarms := []Farm{
		{
			FarmName:           "Green Valley Organic Farm",
			CorpName:           "Tomatoes",
			TimestampLastWater: time.Date(2024, 9, 18, 0, 0, 0, 0, time.UTC),
			Farmer:             "Nakul Bhandare",
		},
		{
			FarmName:           "Green Valley Organic Farm",
			CorpName:           "Corn",
			TimestampLastWater: time.Date(2024, 9, 17, 0, 0, 0, 0, time.UTC),
			Farmer:             "Nakul Bhandare",
		},
		{
			FarmName:           "Green Valley Organic Farm",
			CorpName:           "Wheat",
			TimestampLastWater: time.Date(2024, 9, 16, 0, 0, 0, 0, time.UTC),
			Farmer:             "Nakul Bhandare",
		},
		{
			FarmName:           "Mountain View Vineyard",
			CorpName:           "Cabernet Sauvignon",
			TimestampLastWater: time.Date(2024, 9, 18, 0, 0, 0, 0, time.UTC),
			Farmer:             "Nakul Bhandare",
		},
		{
			FarmName:           "Coastal Citrus Grove",
			CorpName:           "Oranges",
			TimestampLastWater: time.Date(2024, 9, 18, 0, 0, 0, 0, time.UTC),
			Farmer:             "Nakul Bhandare",
		},
	}

	// Convert to interface slice for MongoDB
	documents := make([]interface{}, len(sampleFarms))
	for i, farm := range sampleFarms {
		documents[i] = farm
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	result, err := farmCollection.InsertMany(ctx, documents)
	if err != nil {
		c.JSON(http.StatusInternalServerError, FarmResponse{
			Success: false,
			Message: fmt.Sprintf("Failed to insert sample data: %v", err),
		})
		return
	}

	c.JSON(http.StatusCreated, FarmResponse{
		Success: true,
		Message: fmt.Sprintf("Successfully inserted %d sample farm records", len(result.InsertedIDs)),
		Data: map[string]interface{}{
			"insertedIds": result.InsertedIDs,
			"count":       len(result.InsertedIDs),
		},
	})
}

// Health check endpoint
func healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, FarmResponse{
		Success: true,
		Message: "API is running successfully",
		Data: map[string]interface{}{
			"timestamp": time.Now(),
			"status":    "healthy",
		},
	})
}

// Setup routes
func setupRoutes() *gin.Engine {
	r := gin.Default()

	// Middleware for CORS
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// API routes
	api := r.Group("/api/v1")
	{
		api.GET("/health", healthCheck)
		api.POST("/farms", insertFarm)
		api.POST("/farms/bulk", insertMultipleFarms)
		api.POST("/farms/sample", insertSampleData)
		api.GET("/farms", getAllFarms)
		api.GET("/farms/farmer/:farmer", getFarmsByFarmer)
	}

	return r
}

func main() {
	// Connect to MongoDB
	if err := connectToMongoDB(); err != nil {
		log.Fatal("Failed to connect to MongoDB:", err)
	}
	defer disconnectMongoDB()

	// Setup routes
	router := setupRoutes()

	// Start server
	port := ":8081"
	log.Printf("Starting server on port %s", port)
	log.Printf("API endpoints:")
	log.Printf("  POST /api/v1/farms - Insert single farm")
	log.Printf("  POST /api/v1/farms/bulk - Insert multiple farms")
	log.Printf("  POST /api/v1/farms/sample - Insert sample data")
	log.Printf("  GET  /api/v1/farms - Get all farms")
	log.Printf("  GET  /api/v1/farms/farmer/:farmer - Get farms by farmer")
	log.Printf("  GET  /api/v1/health - Health check")

	if err := router.Run(port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
