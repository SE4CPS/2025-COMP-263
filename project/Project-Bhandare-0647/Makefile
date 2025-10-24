.PHONY: help install seed validate server test clean

# Default target
help:
	@echo "IoT MongoDB Project - Available Commands:"
	@echo ""
	@echo "  make install    - Install Go dependencies"
	@echo "  make seed       - Populate database with 50 sample readings"
	@echo "  make validate   - Setup schema validation and indexes"
	@echo "  make server     - Start the API server"
	@echo "  make test       - Test all API endpoints"
	@echo "  make clean      - Remove built binaries"
	@echo ""
	@echo "Quick Start:"
	@echo "  1. make install"
	@echo "  2. make seed"
	@echo "  3. make validate"
	@echo "  4. make server    (in one terminal)"
	@echo "  5. make test      (in another terminal)"

# Install dependencies
install:
	@echo "Installing dependencies..."
	go mod download
	@echo "✓ Dependencies installed"

# Seed database
seed:
	@echo "Seeding database with sample data..."
	go run seed.go
	@echo "✓ Database seeded - Check MongoDB Compass!"

# Setup validation and indexes
validate:
	@echo "Setting up validation and indexes..."
	go run setup_validation.go
	@echo "✓ Validation and indexes configured"

# Start server
server:
	@echo "Starting API server on port 8080..."
	go run server.go

# Test API endpoints
test:
	@echo "Testing API endpoints..."
	@chmod +x test_api.sh
	@./test_api.sh

# Build binaries
build:
	@echo "Building binaries..."
	go build -o bin/server server.go
	go build -o bin/seed seed.go
	go build -o bin/setup_validation setup_validation.go
	@echo "✓ Binaries built in bin/"

# Clean built files
clean:
	@echo "Cleaning built files..."
	@rm -rf bin/
	@echo "✓ Cleaned"

# Run all setup steps
setup: install seed validate
	@echo "✓ Setup complete! Now run 'make server' to start the API"
