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

// DataLakeDocument represents a document in the data lake with metadata
type DataLakeDocument struct {
	Data        interface{} `json:"data" bson:"data"`
	SourceDB    string      `json:"sourceDB" bson:"sourceDB"`
	IngestedAt  string      `json:"ingestedAt" bson:"ingestedAt"`
	Tags        []string    `json:"tags" bson:"tags"`
	DataType    string      `json:"dataType,omitempty" bson:"dataType,omitempty"`
}

// FarmResponse represents the API response structure
type FarmResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Data    any    `json:"data,omitempty"`
}

// MongoDB connection variables
var (
	mongoClient     *mongo.Client
	farmCollection  *mongo.Collection
	lakeCollection  *mongo.Collection
	
	// Lab 2 MongoDB (original)
	lab2MongoURI = "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/"
	lab2DBName   = "farmdb"
	
	// Lab 3 Data Lake MongoDB
	lakeMongoURI = "mongodb+srv://i40:dbms2@cluster0.lixbqmp.mongodb.net/"
	lakeDBName   = "Project1"
	lakeColName  = "lake"
)

// Connect to MongoDB (both Lab 2 and Data Lake)
func connectToMongoDB() error {
	// Connect to Lab 2 MongoDB
	lab2ClientOptions := options.Client().ApplyURI(lab2MongoURI)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	lab2Client, err := mongo.Connect(ctx, lab2ClientOptions)
	if err != nil {
		return fmt.Errorf("failed to connect to Lab 2 MongoDB: %v", err)
	}

	err = lab2Client.Ping(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to ping Lab 2 MongoDB: %v", err)
	}

	farmCollection = lab2Client.Database(lab2DBName).Collection("farms")
	log.Println("Connected to Lab 2 MongoDB (farmdb) successfully!")

	// Connect to Data Lake MongoDB
	lakeClientOptions := options.Client().ApplyURI(lakeMongoURI)
	lakeClient, err := mongo.Connect(ctx, lakeClientOptions)
	if err != nil {
		return fmt.Errorf("failed to connect to Data Lake MongoDB: %v", err)
	}

	err = lakeClient.Ping(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to ping Data Lake MongoDB: %v", err)
	}

	mongoClient = lakeClient
	lakeCollection = lakeClient.Database(lakeDBName).Collection(lakeColName)
	log.Println("Connected to Data Lake MongoDB (Project1.lake) successfully!")

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

// Insert single farm record (Lab 2 functionality)
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

// Insert multiple farm records (Lab 2 functionality)
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

// NEW LAB 3: Push data from IndexedDB to Data Lake
func pushIndexedDBToLake(c *gin.Context) {
	var payload struct {
		Data []interface{} `json:"data"`
		Tags []string      `json:"tags"`
	}

	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, FarmResponse{
			Success: false,
			Message: fmt.Sprintf("Invalid JSON format: %v", err),
		})
		return
	}

	if len(payload.Data) == 0 {
		c.JSON(http.StatusBadRequest, FarmResponse{
			Success: false,
			Message: "No data provided",
		})
		return
	}

	// Prepare documents for data lake with metadata
	documents := make([]interface{}, len(payload.Data))
	ingestedAt := time.Now().UTC().Format(time.RFC3339)
	
	tags := payload.Tags
	if len(tags) == 0 {
		tags = []string{"indexeddb", "browser-storage", "farm-data"}
	}

	for i, data := range payload.Data {
		documents[i] = DataLakeDocument{
			Data:       data,
			SourceDB:   "IndexedDB",
			IngestedAt: ingestedAt,
			Tags:       tags,
			DataType:   "farm-record",
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	result, err := lakeCollection.InsertMany(ctx, documents)
	if err != nil {
		c.JSON(http.StatusInternalServerError, FarmResponse{
			Success: false,
			Message: fmt.Sprintf("Failed to push to data lake: %v", err),
		})
		return
	}

	c.JSON(http.StatusCreated, FarmResponse{
		Success: true,
		Message: fmt.Sprintf("Successfully pushed %d records from IndexedDB to data lake", len(result.InsertedIDs)),
		Data: map[string]interface{}{
			"insertedIds": result.InsertedIDs,
			"count":       len(result.InsertedIDs),
			"sourceDB":    "IndexedDB",
			"ingestedAt":  ingestedAt,
		},
	})
}

// NEW LAB 3: Push data from Neo4j to Data Lake
func pushNeo4jToLake(c *gin.Context) {
	var payload struct {
		Data []interface{} `json:"data"`
		Tags []string      `json:"tags"`
	}

	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, FarmResponse{
			Success: false,
			Message: fmt.Sprintf("Invalid JSON format: %v", err),
		})
		return
	}

	if len(payload.Data) == 0 {
		c.JSON(http.StatusBadRequest, FarmResponse{
			Success: false,
			Message: "No data provided",
		})
		return
	}

	// Prepare documents for data lake with metadata
	documents := make([]interface{}, len(payload.Data))
	ingestedAt := time.Now().UTC().Format(time.RFC3339)
	
	tags := payload.Tags
	if len(tags) == 0 {
		tags = []string{"neo4j", "graph-database", "agriculture", "iot"}
	}

	for i, data := range payload.Data {
		documents[i] = DataLakeDocument{
			Data:       data,
			SourceDB:   "Neo4j",
			IngestedAt: ingestedAt,
			Tags:       tags,
			DataType:   "graph-data",
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	result, err := lakeCollection.InsertMany(ctx, documents)
	if err != nil {
		c.JSON(http.StatusInternalServerError, FarmResponse{
			Success: false,
			Message: fmt.Sprintf("Failed to push to data lake: %v", err),
		})
		return
	}

	c.JSON(http.StatusCreated, FarmResponse{
		Success: true,
		Message: fmt.Sprintf("Successfully pushed %d records from Neo4j to data lake", len(result.InsertedIDs)),
		Data: map[string]interface{}{
			"insertedIds": result.InsertedIDs,
			"count":       len(result.InsertedIDs),
			"sourceDB":    "Neo4j",
			"ingestedAt":  ingestedAt,
		},
	})
}

// NEW LAB 3: Get all data lake records
func getDataLakeRecords(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Optional query parameter to filter by sourceDB
	sourceDB := c.Query("sourceDB")
	
	filter := bson.M{}
	if sourceDB != "" {
		filter["sourceDB"] = sourceDB
	}

	cursor, err := lakeCollection.Find(ctx, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, FarmResponse{
			Success: false,
			Message: fmt.Sprintf("Failed to fetch data lake records: %v", err),
		})
		return
	}
	defer cursor.Close(ctx)

	var records []bson.M
	if err = cursor.All(ctx, &records); err != nil {
		c.JSON(http.StatusInternalServerError, FarmResponse{
			Success: false,
			Message: fmt.Sprintf("Failed to decode records: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, FarmResponse{
		Success: true,
		Message: "Data lake records retrieved successfully",
		Data: map[string]interface{}{
			"records": records,
			"count":   len(records),
		},
	})
}

// Get all farms (Lab 2 functionality)
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

// Get farms by farmer name (Lab 2 functionality)
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

// Insert sample data (Lab 2 functionality)
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
		
		// Lab 2 - Original farm endpoints
		api.POST("/farms", insertFarm)
		api.POST("/farms/bulk", insertMultipleFarms)
		api.POST("/farms/sample", insertSampleData)
		api.GET("/farms", getAllFarms)
		api.GET("/farms/farmer/:farmer", getFarmsByFarmer)
		
		// Lab 3 - NEW Data Lake endpoints
		api.POST("/lake/indexeddb", pushIndexedDBToLake)
		api.POST("/lake/neo4j", pushNeo4jToLake)
		api.GET("/lake", getDataLakeRecords)
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
	log.Printf("\n========================================")
	log.Printf("Lab 2 Endpoints (Original):")
	log.Printf("  POST /api/v1/farms - Insert single farm")
	log.Printf("  POST /api/v1/farms/bulk - Insert multiple farms")
	log.Printf("  POST /api/v1/farms/sample - Insert sample data")
	log.Printf("  GET  /api/v1/farms - Get all farms")
	log.Printf("  GET  /api/v1/farms/farmer/:farmer - Get farms by farmer")
	log.Printf("\nLab 3 Endpoints (NEW - Data Lake):")
	log.Printf("  POST /api/v1/lake/indexeddb - Push IndexedDB data to lake")
	log.Printf("  POST /api/v1/lake/neo4j - Push Neo4j data to lake")
	log.Printf("  GET  /api/v1/lake - Get all data lake records")
	log.Printf("  GET  /api/v1/lake?sourceDB=Neo4j - Filter by source")
	log.Printf("\nOther:")
	log.Printf("  GET  /api/v1/health - Health check")
	log.Printf("========================================\n")

	if err := router.Run(port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
