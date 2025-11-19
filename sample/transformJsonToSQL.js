const data = [
    {"field_id": "F1", "crop": "Tomato", readings: [18, 15, 12, 9, 10]},
    {"field_id": "F2", "crop": "Corn",   readings: [22, 24, 21, 23, 25]},
    {"field_id": "F3", "crop": "Almond", readings: [11, 10, 8, 7, 9]}
  ];

console.log("Data: ", data);

/*

Target SQL Table:
soil_alerts(
  field_id VARCHAR, 
  crop VARCHAR,
  avg_moisture DECIMAL(5,2), 
  alert_flag BOOLEAN
  )

Task:
Using map, filter, and reduce thinking, show how you would transform the JSON into rows for the soil_alerts table.

• MAP: Iterate over each field and its readings.
• FILTER: Include only fields whose average moisture < 12.
• REDUCE: For each included field, compute the average moisture and set
  alert_flag = TRUE (otherwise FALSE).

*/

let map = data.map(v => {
    return {
    ...v,
    alert_flag: false,
    avg_moisture: (v.readings.reduce((k,v) => 
      k = k + v
    ,0)) / v.readings.length
  }
});

console.log("Mapped", map);

delete map.readings;

let filter = map.filter(v => v.avg_moisture < 12);

console.log("Filter", filter);

/*
  field_id VARCHAR, 
  crop VARCHAR,
  avg_moisture DECIMAL(5,2), 
  alert_flag BOOLEAN
*/
