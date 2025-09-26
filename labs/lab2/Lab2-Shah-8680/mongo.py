from flask import Flask, request, jsonify
from pymongo import MongoClient
import uuid
from datetime import datetime

app = Flask(__name__)

# Replace with your MongoDB connection string
mongo_url = "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/"
client = MongoClient(mongo_url)
db = client["Lab2"]         # database
# 1. Connect to MongoDB Atlas
client = MongoClient("mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority")
db = client["Lab2"]        # database
collection = db["Agriculture"]   # collection


@app.route('/add', methods=['POST'])
@app.route("/add", methods=["POST"])
def add_data():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400
    result = collection.insert_one(data)
    return jsonify({"message": "Data inserted", "id": str(result.inserted_id)})
    data = request.json

    # 2. Add metadata + UTC timestamp automatically
    metadata = {
        "author": "Parth Shah",
        "last_sync": datetime.utcnow().isoformat() + "Z",
        "uuid_source": str(uuid.uuid4())
    }

@app.route('/get', methods=['GET'])
def get_data():
    records = list(collection.find({}, {"_id": 0}))
    return jsonify(records)
    # 3. Build final document (like your sample)
    doc = {
        "id": data.get("id", 1),
        "sensorId": data.get("sensorId", "SENSOR-1"),
        "reading": data.get("reading", "6.50"),
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "notes": data.get("notes", "MongoDB sync reading 1"),
        "metadata": metadata
    }

    # 4. Insert into Mongo
    collection.insert_one(doc)

if __name__ == '__main__':
    app.run(debug=True)
    return jsonify({"message": "Inserted successfully", "doc": doc}), 201


if __name__ == "__main__":
    app.run(debug=True)
