const WebSocket = require('ws');
const PORT = process.env.PORT || 8080;

const wss = new WebSocket.Server({ port: PORT });
const rooms = new Map();

// Security: CORS shield allowing only authorized origins
const ALLOWED_ORIGINS = ['https://www.castslate.app', 'https://castslate.app', 'http://localhost'];

wss.on('connection', (ws, req) => {
    const origin = req.headers.origin;
    
    if (origin && !ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed))) {
        console.log(`Security Shield: Rejected connection from -> ${origin}`);
        ws.terminate(); 
        return;
    }

    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    let currentPin = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'join_room') {
                currentPin = data.pin;
                if (!rooms.has(currentPin)) rooms.set(currentPin, new Set());
                rooms.get(currentPin).add(ws);
                console.log(`Connection Successful - PIN: ${currentPin}`);
                return;
            }

            if (currentPin && rooms.has(currentPin)) {
                rooms.get(currentPin).forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(message.toString());
                    }
                });
            }
        } catch (error) {
            console.error("Format error (Harmless):", error);
        }
    });

    ws.on('close', () => {
        if (currentPin && rooms.has(currentPin)) {
            rooms.get(currentPin).delete(ws);
            if (rooms.get(currentPin).size === 0) rooms.delete(currentPin);
        }
    });
});

// Heartbeat system to prevent cross-continent disconnections
setInterval(() => {
    wss.clients.forEach((ws) => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

console.log(`Masterpiece Server is running on port ${PORT}! 🛡️🚀`);