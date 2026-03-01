const io = require('socket.io-client');

const socket = io('http://localhost:3001');

socket.on('connect', () => {
    console.log('Connected to WebSocket server as', socket.id);
});

socket.on('price_update', (data) => {
    console.log('Received live data from NSE:', data);
});

socket.on('connect_error', (error) => {
    console.error('Connection failed:', error.message);
});
