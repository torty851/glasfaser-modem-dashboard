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
const CACHE_DURATION = 1000; // 1 second cache for live data

// History storage (keep last 3600 entries = 1 hour at 1s interval)
const history = {
    traffic: [],
    power: [],
    timestamps: []
};
const MAX_HISTORY = 3600;

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

// Update history with new data
function updateHistory(data) {
    if (!data || !data.success) return;

    const txBytes = parseInt(data.data.txbytes) || 0;
    const rxBytes = parseInt(data.data.rxbytes) || 0;
    const txPower = parseFloat(data.data.txpower) || 0;
    const rxPower = parseFloat(data.data.rxpower) || 0;

    history.traffic.push({ tx: txBytes, rx: rxBytes });
    history.power.push({ tx: txPower, rx: rxPower });
    history.timestamps.push(data.timestamp);

    // Trim to max history
    if (history.timestamps.length > MAX_HISTORY) {
        history.traffic.shift();
        history.power.shift();
        history.timestamps.shift();
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

    // Update history
    updateHistory(data);

    res.json(data);
});

// API endpoint for live traffic data
app.get('/api/traffic', (req, res) => {
    res.json({
        history: {
            traffic: history.traffic,
            power: history.power,
            timestamps: history.timestamps
        },
        count: history.timestamps.length
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        uptime: process.uptime(),
        historyEntries: history.timestamps.length
    });
});

// Start background polling for live data
setInterval(async () => {
    const data = await fetchModemData();
    if (data.success) {
        cachedData = data;
        lastFetch = Date.now();
        updateHistory(data);
    }
}, 1000); // Poll every second

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Glasfaser Modem Dashboard running on http://0.0.0.0:${PORT}`);
    console.log(`Polling modem at ${MODEM_URL}`);
});