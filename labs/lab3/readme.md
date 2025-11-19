# Lab 3 – Neo4j + MongoDB Lake

This lab extends Lab 2 by connecting **Neo4j** (graph database) with **MongoDB Atlas (data lake)**.  
You will pull graph data from Neo4j → push into MongoDB → query results → and submit screenshots + code.  

---

## 📂 1. Setup

### Clone the class repo (if not already)
```bash
git clone https://github.com/SE4CPS/2025-COMP-263.git
cd 2025-COMP-263/labs/lab3
```

### Install Node.js dependencies
```bash
npm init -y               # create package.json (if missing)
npm install dotenv neo4j-driver mongodb
```

### Configure environment variables
Copy `.env.template` → `.env`:
```bash
cp .env.template .env
```


⚠️ **Never commit `.env`** to GitHub. It is already in `.gitignore`.  

---

## 🟦 2. Test Neo4j Connection

Run the sample connection script:

```bash
node labs/lab3/sampleNeo4jConnection.js
```

Expected output:
```
Connected to Neo4j Aura!
```

If you see a connection error, check:
- `.env` values (especially password)  
- Internet connection (Neo4j Aura requires TLS)  

---

## 🟩 3. Create Sample Data in Neo4j (via Browser)

Open **Neo4j Browser** (from Aura console) and run:

```cypher
MERGE (f:Farm {id:'farm-01', name:'Delta Farms'})
MERGE (d:Device {id:'sensor-001', type:'soil'})
MERGE (r:Reading {id:'r-0001', tempC:22.4, moisture:0.31, humidity:55, ts:datetime('2025-09-25T10:00:00Z')})
MERGE (f)-[:HAS_DEVICE]->(d)
MERGE (d)-[:GENERATES]->(r);
```

Then visualize:
```cypher
MATCH (f:Farm)-[:HAS_DEVICE]->(d:Device)-[:GENERATES]->(r:Reading)
RETURN f,d,r;
```

Take a **screenshot** of the graph.

---

## 🟨 4. Push Neo4j Data into MongoDB

Run the integration script:
```bash
node labs/lab3/pushNeo4jToMongo.js
```

Expected log:
```
Inserted X docs into Mongo lake
```

---

## 🟥 5. Query in MongoDB Compass

Open MongoDB Compass → connect using the provided connection string → select `Project1.lake` collection.

Run:
```js
db.lake.find({})
```

And:
```js
db.lake.find({ sourceDB: "Neo4j" })
```

Take **screenshots** of both results.

---

## 🔧 Useful Bash Commands

- Copy `.env.template` → `.env`:
  ```bash
  cp .env.template .env
  ```

- Install dependencies:
  ```bash
  npm install
  ```

- Run scripts:
  ```bash
  node labs/lab3/sampleNeo4jConnection.js
  node labs/lab3/pushNeo4jToMongo.js
  ```

- Check if `.env` is ignored by git:
  ```bash
  git check-ignore -v .env
  ```

- Stage & commit your lab folder:
  ```bash
  git add labs/lab3-lastname-XXXX
  git commit -m "Lab 3 submission"
  git push origin main
  ```

---
