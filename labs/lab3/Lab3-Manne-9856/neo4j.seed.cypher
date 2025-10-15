MATCH (f:Farm) DETACH DELETE f;
MATCH (d:Device) DETACH DELETE d;
MATCH (r:Reading) DETACH DELETE r;

MERGE (f1:Farm {id:"F-001"}) SET f1.name="Sunrise Farm", f1.location="Stockton";
MERGE (f2:Farm {id:"F-002"}) SET f2.name="Riverbend Farm", f2.location="Lodi";

MERGE (d1:Device {id:"D-001"}) SET d1.type="SoilMoisture", d1.model="SM-100";
MERGE (d2:Device {id:"D-002"}) SET d2.type="Thermometer",  d2.model="TH-200";
MERGE (d3:Device {id:"D-003"}) SET d3.type="pHProbe",      d3.model="PH-10";

MERGE (f1)-[:HAS_DEVICE]->(d1);
MERGE (f1)-[:HAS_DEVICE]->(d2);
MERGE (f2)-[:HAS_DEVICE]->(d3);

MERGE (r1:Reading {rid:"R-1001"}) SET r1.metric="moisture", r1.value=31.2, r1.unit="%",  r1.ts=datetime("2025-10-14T16:00:00Z");
MERGE (r2:Reading {rid:"R-1002"}) SET r2.metric="temp",     r2.value=24.8, r2.unit="C",  r2.ts=datetime("2025-10-14T16:01:00Z");
MERGE (r3:Reading {rid:"R-1003"}) SET r3.metric="ph",       r3.value=6.5,  r1.unit="pH", r3.ts=datetime("2025-10-14T16:02:00Z");
MERGE (r4:Reading {rid:"R-1004"}) SET r4.metric="moisture", r4.value=28.7, r4.unit="%",  r4.ts=datetime("2025-10-14T16:05:00Z");

MERGE (d1)-[:GENERATES]->(r1);
MERGE (d2)-[:GENERATES]->(r2);
MERGE (d3)-[:GENERATES]->(r3);
MERGE (d1)-[:GENERATES]->(r4);