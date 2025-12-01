// api_fetch.js
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const LAT = process.env.LATITUDE || 37.9577;
const LON = process.env.LONGITUDE || -121.2908;

async function main() {
    const url = 'https://archive-api.open-meteo.com/v1/archive';
    const params = {
        latitude: LAT,
        longitude: LON,
        daily: ['temperature_2m_max', 'temperature_2m_min', 'precipitation_sum'],
        timezone: 'America/Los_Angeles',
        past_days: 365,
        forecast_days: 1
    };

    const resp = await axios.get(url, { params });

    const envelope = {
        payload: resp.data,
        metadata: {
            source_timestamp: new Date().toISOString(),
            source_database: 'open-meteo',
            data_quality: 'raw',
            api_request_id: require('crypto').randomUUID(),
            etl_batch_id: require('crypto').randomUUID()
        }
    };

    fs.writeFileSync(
        './latest_open_meteo.json',
        JSON.stringify(envelope, null, 2),
        'utf8'
    );

    console.log(JSON.stringify(envelope, null, 2));
}

main().catch(err => {
    console.error('Error in api_fetch:', err);
    process.exit(1);
});
