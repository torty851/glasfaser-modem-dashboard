const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 8080;
const MODEM_URL = 'http://192.168.100.1/ONT/client/data/Status.json';

// Enable CORS for frontend
app.use(cors());
app.use(express.static('public'));

// Cache for modem data
let cachedData = null;
let lastFetch = 0;
const CACHE_DURATION = 4000; // 4 seconds cache

// Parse modem JSON array to object
function parseModemData(jsonArray) {
    const data = {};
    jsonArray.forEach(item => {
        data[item.varid] = item.varvalue;
    });
    return data;
}

// Fetch data from modem
async function fetchModemData() {
    try {
        const response = await fetch(MODEM_URL, {
            headers: { 'Accept-Language': 'de' },
            timeout: 5000
        });

        if (!response.ok) {
            throw new Error(`Modem returned ${response.status}`);
        }

        const jsonArray = await response.json();
        return {
            success: true,
            data: parseModemData(jsonArray),
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error fetching modem data:', error.message);
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

// API endpoint for modem status
app.get('/api/status', async (req, res) => {
    const now = Date.now();

    // Use cache if fresh
    if (cachedData && (now - lastFetch) < CACHE_DURATION) {
        return res.json(cachedData);
    }

    // Fetch fresh data
    const data = await fetchModemData();
    cachedData = data;
    lastFetch = now;

    res.json(data);
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Glasfaser Modem Dashboard running on http://0.0.0.0:${PORT}`);
    console.log(`Polling modem at ${MODEM_URL}`);
});