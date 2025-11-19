from flask import Flask, request, jsonify
from pymongo import MongoClient

app = Flask(__name__)

# Replace with your MongoDB connection string
mongo_url = "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/"
client = MongoClient(mongo_url)
db = client["Lab2"]         # database
collection = db["Agriculture"]   # collection


@app.route('/add', methods=['POST'])
def add_data():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400
    result = collection.insert_one(data)
    return jsonify({"message": "Data inserted", "id": str(result.inserted_id)})


@app.route('/get', methods=['GET'])
def get_data():
    records = list(collection.find({}, {"_id": 0}))
    return jsonify(records)


if __name__ == '__main__':
    app.run(debug=True)

