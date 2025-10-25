const { MongoClient } = require("mongodb");
const uri = "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/";
const client = new MongoClient(uri);
const DB = "Project1";
const COLL = "Readings";
const validator = {
  $jsonSchema: {
    bsonType: "object",
    required: ["deviceId","farmId","timestamp","gps"],
    properties: {
      deviceId: { bsonType: "string" },
      farmId: { bsonType: "string" },
      timestamp: { bsonType: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?Z$" },
      gps: { bsonType: "object", required: ["lat","lon"], properties: {
        lat: { bsonType: ["double","int"], minimum: -90, maximum: 90 },
        lon: { bsonType: ["double","int"], minimum: -180, maximum: 180 }
      }}
    }
  }
};
(async()=>{
  try{
    await client.connect();
    const db = client.db(DB);
    const c = db.collection(COLL);
    try{ await c.createIndex({ timestamp: 1 }, { name: "ts_idx" }); console.log("index ok"); }catch(e){ console.log("index err"); }
    try{
      const r = await db.command({ collMod: COLL, validator, validationLevel: "moderate", validationAction: "error" });
      console.log("validator ok", r.ok === 1);
    }catch(e){
      console.log("collMod blocked");
      console.log(JSON.stringify(validator,null,2));
    }
    const idx = await c.indexes();
    console.log(JSON.stringify(idx.map(i=>({name:i.name,key:i.key})),null,2));
  }finally{
    await client.close();
  }
})();
