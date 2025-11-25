import sensorData from './sql_sensors.json' with { type: "json" };
import readingsData from './sql_readings_100rows.json' with { type: "json" };
import fs from 'fs';
import crypto from 'crypto';

const mergeData = () => {
    const mergedData = readingsData.map(d => {
        const sensor = sensorData[d.sensor_id - 1];
        
        return {
            _id: crypto.randomUUID(),
            farmId: sensor.farm_id,
            deviceId: sensor.device_id,
            crop: sensor.crop,
            gps: {lat: sensor.lat, lon: sensor.lon},
            ts_utc: d.ts_utc,
            soil_moisture: d.soil_moisture,
            temp_c: d.temp_c,
            battery_v: d.battery_v
        };
    });

    return mergedData;
};

const enrichMergedData = () => {
    const enrichedData = mergedData.map(d => {
        const {_id, crop, gps, ...rest} = d;
        const payload = JSON.stringify(rest);
        const checksum_md5 = crypto.createHash('md5').update(payload).digest('hex');

        const metadata = {
            uuid: d._id,
            checksum_md5: checksum_md5,
            author: "Ravi Pareshbhai Kakadia",
            sync_time_utc: new Date().toISOString(),
            source_db: "sql_agriculture_db",
            source_tables: ["sql_sensors", "sql_readings"],
            ingest_batch_id: `BATCH ${new Date().toDateString}`,
            lineage: `${d.deviceId}/${d.ts_utc}`,
            units: {
                soil_moisture: "percentage",
                temp_c: "celsius",
                battery_v: "volts"
            },
            quality_flags: {
                validated: true,
                complete: true,
                anomaly_detected: false
            }
        };

        return {
            ...d,
            metadata: metadata
        };
    });

    return enrichedData;
};

const shardingData = () => {
    const shards = enrichedData.reduce((acc, d) => {
        const shardName = `readings_${d.farmId}_${d.crop}`;
        acc[shardName] = acc[shardName] ? acc[shardName].concat(d) : [d];
        return acc;
    }, {});

    return shards;
};

const mergedData = mergeData();

fs.writeFileSync('output_merged_data.json', JSON.stringify(mergedData, null, 2));

const enrichedData = enrichMergedData(mergedData);

fs.writeFileSync('output_enriched_data.json', JSON.stringify(enrichedData, null, 2));

const shardedData = shardingData();

fs.writeFileSync('output_sharded_data.json', JSON.stringify(shardedData, null, 2));

const shardObjectsSummary = Object.keys(shardedData).map(name => {
    return {
        name: name,
        count: shardedData[name].length
    };
});

console.log(shardObjectsSummary);





