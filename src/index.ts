import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { initDb, query } from './db';
import { startPriceCron } from './cron/priceCron';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const port = process.env.PORT || 3001;

// Middlewares
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST']
}));
app.use(express.json());

// Initialize HTTP server and Socket.io
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        methods: ['GET', 'POST']
    }
});

// REST API endpoint to get historical prices
app.get('/api/history/:symbol', async (req, res) => {
    try {
        const symbol = req.params.symbol.toUpperCase();
        const limit = parseInt(req.query.limit as string) || 50;

        const result = await query(
            `SELECT * FROM market_prices 
       WHERE symbol = $1 
       ORDER BY timestamp DESC 
       LIMIT $2`,
            [symbol, limit]
        );

        // Return data sorted oldest to newest for easy charting
        res.json(result.rows.reverse());
    } catch (error) {
        console.error('Error fetching historical data:', error);
        res.status(500).json({ error: 'Failed to fetch historical data' });
    }
});

// Socket.io Connection Handler
io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
        console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
});

// Start Server Routine
const startServer = async () => {
    try {
        // 1. Initialize the Database Schema (Wait for it to finish)
        await initDb();

        // 2. Start the Price Cron Job
        startPriceCron(io);

        // 3. Start listening for incoming requests
        httpServer.listen(port, () => {
            console.log(`🚀 Server is running on http://localhost:${port}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
