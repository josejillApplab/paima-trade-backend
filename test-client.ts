import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

socket.on('connect', () => {
    console.log('✅ Connected to Paima Trade Backend testing client.');
});

socket.on('price_update', (data: any) => {
    console.log('📈 Received Real-Time Price Update:', data);
});

socket.on('disconnect', () => {
    console.log('❌ Disconnected from backend.');
});
