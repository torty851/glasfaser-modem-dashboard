# Glasfaser Modem 2 Status Dashboard

Real-time monitoring dashboard for Telekom Glasfaser-Modem 2.

## Features

- **Real-time power levels**: TX/RX optical power (dBm)
- **Traffic monitoring**: TX/RX bytes with live graphs
- **Device info**: Firmware, hardware revision, serial number
- **Connection status**: Link speed, uptime, packet counts
- **Auto-refresh**: Updates every 5 seconds

## Data Source

Fetches data from: `http://192.168.100.1/ONT/client/data/Status.json`

**Important**: Requires `Accept-Language: de` header for successful requests.

## Quick Start

### Docker (Recommended)

```bash
docker-compose up -d
```

Dashboard will be available at: http://localhost:8080

### Manual Start

```bash
npm install
npm start
```

## Deployment on deb01 (OpenClaw server)

The dashboard runs on deb01 (192.168.8.96) which has network access to the modem at 192.168.100.1.

```bash
cd /root/.openclaw/workspace/glasfaser-modem-dashboard
docker-compose up -d
```

Access: http://192.168.8.96:8080

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: Vanilla JS + Chart.js
- **Container**: Docker
- **Port**: 8080

## API Endpoints

- `GET /api/status` - Current modem status (JSON)
- `GET /api/health` - Server health check

## Metrics Displayed

| Metric | Description |
|--------|-------------|
| TX Power | Optical send power (dBm) |
| RX Power | Optical receive power (dBm) |
| TX Bytes | Total bytes sent |
| RX Bytes | Total bytes received |
| TX Packets | Total packets sent |
| RX Packets | Total packets received |
| Link Speed | Connection speed (Mbps) |
| Uptime | Modem uptime |
| Firmware | Current firmware version |
| Stability | Stability counter |

## License

MIT