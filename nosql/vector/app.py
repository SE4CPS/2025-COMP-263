# faiss_agriculture_example.py
# Example: Using FAISS to find farms with similar crop conditions

import numpy as np
import faiss

# --- Step 1: Sample agricultural data (rainfall, soil pH, yield) ---
# Each row represents a farm; values are normalized numeric features
farm_data = np.array([
    [0.75, 0.60, 0.82],  # Farm A
    [0.80, 0.62, 0.81],  # Farm B
    [0.25, 0.30, 0.28],  # Farm C
    [0.78, 0.65, 0.85],  # Farm D
    [0.40, 0.50, 0.55]   # Farm E
], dtype='float32')

farm_names = ["Farm A", "Farm B", "Farm C", "Farm D", "Farm E"]

# --- Step 2: Build FAISS index ---
dimension = farm_data.shape[1]
index = faiss.IndexFlatL2(dimension)  # L2 distance (Euclidean)
index.add(farm_data)  # add all vectors to index

# --- Step 3: Query: Find farms similar to Farm A ---
query = np.array([[0.75, 0.60, 0.82]], dtype='float32')
distances, indices = index.search(query, k=3)  # top-3 nearest farms

print("Query:", farm_names[0])
for rank, idx in enumerate(indices[0]):
    print(f"{rank+1}. {farm_names[idx]} (distance={distances[0][rank]:.4f})")