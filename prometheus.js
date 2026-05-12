const express = require('express');
const fetch = require('node-fetch');

const PORT = 9091;
const MODEM_URL = 'http://192.168.100.1/ONT/client/data/Status.json';

// Cache for modem data
let cachedData = null;
let lastFetch = 0;
const CACHE_DURATION = 1000; // 1 second cache

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

// Prometheus metrics server
const app = express();

app.get('/metrics', async (req, res) => {
    const data = await fetchModemData();
    
    if (!data.success) {
        res.status(500).send('# Error fetching modem data\n');
        return;
    }

    const d = data.data;
    const metrics = [];

    // Power levels
    metrics.push(`# HELP modem_tx_power_dbm TX optical power in dBm`);
    metrics.push(`# TYPE modem_tx_power_dbm gauge`);
    metrics.push(`modem_tx_power_dbm ${parseFloat(d.txpower).toFixed(2)}`);

    metrics.push(`# HELP modem_rx_power_dbm RX optical power in dBm`);
    metrics.push(`# TYPE modem_rx_power_dbm gauge`);
    metrics.push(`modem_rx_power_dbm ${parseFloat(d.rxpower).toFixed(2)}`);

    // Traffic
    metrics.push(`# HELP modem_tx_bytes_total TX bytes (Download)`);
    metrics.push(`# TYPE modem_tx_bytes_total counter`);
    metrics.push(`modem_tx_bytes_total ${d.txbytes}`);

    metrics.push(`# HELP modem_rx_bytes_total RX bytes (Upload)`);
    metrics.push(`# TYPE modem_rx_bytes_total counter`);
    metrics.push(`modem_rx_bytes_total ${d.rxbytes}`);

    // Packets
    metrics.push(`# HELP modem_tx_packets_total TX packets`);
    metrics.push(`# TYPE modem_tx_packets_total counter`);
    metrics.push(`modem_tx_packets_total ${d.txpackets}`);

    metrics.push(`# HELP modem_rx_packets_total RX packets`);
    metrics.push(`# TYPE modem_rx_packets_total counter`);
    metrics.push(`modem_rx_packets_total ${d.rxpackets}`);

    metrics.push(`# HELP modem_rx_dropped_packets_total RX dropped packets`);
    metrics.push(`# TYPE modem_rx_dropped_packets_total counter`);
    metrics.push(`modem_rx_dropped_packets_total ${d.rxdrop_packets || 0}`);

    metrics.push(`# HELP modem_rx_crc_errors_total RX CRC errors`);
    metrics.push(`# TYPE modem_rx_crc_errors_total counter`);
    metrics.push(`modem_rx_crc_errors_total ${d.rxbip_crc || 0}`);

    // Connection
    metrics.push(`# HELP modem_link_speed_mbps Link speed in Mbps`);
    metrics.push(`# TYPE modem_link_speed_mbps gauge`);
    metrics.push(`modem_link_speed_mbps ${d.link_status}`);

    metrics.push(`# HELP modem_uptime_seconds Modem uptime in seconds`);
    metrics.push(`# TYPE modem_uptime_seconds gauge`);
    metrics.push(`modem_uptime_seconds ${d.stability}`);

    // Info
    metrics.push(`# HELP modem_info Modem information`);
    metrics.push(`# TYPE modem_info gauge`);
    metrics.push(`modem_info{device="${d.device_name}",firmware="${d.firmware_version}",serial="${d.serial_number}"} 1`);

    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(metrics.join('\n'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Prometheus metrics available on http://0.0.0.0:${PORT}/metrics`);
});