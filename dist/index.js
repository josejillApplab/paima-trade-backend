"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const db_1 = require("./db");
const priceCron_1 = require("./cron/priceCron");
// Load environment variables
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
// Middlewares
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST']
}));
app.use(express_1.default.json());
// Initialize HTTP server and Socket.io
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        methods: ['GET', 'POST']
    }
});
// REST API endpoint to get historical prices
app.get('/api/history/:symbol', async (req, res) => {
    try {
        const symbol = req.params.symbol.toUpperCase();
        const limit = parseInt(req.query.limit) || 50;
        const result = await (0, db_1.query)(`SELECT * FROM market_prices 
       WHERE symbol = $1 
       ORDER BY timestamp DESC 
       LIMIT $2`, [symbol, limit]);
        // Return data sorted oldest to newest for easy charting
        res.json(result.rows.reverse());
    }
    catch (error) {
        console.error('Error fetching historical data:', error);
        res.status(500).json({ error: 'Failed to fetch historical data' });
    }
});
// Phase 2 Routers
const auth_1 = __importDefault(require("./routes/auth"));
const portfolio_1 = __importDefault(require("./routes/portfolio"));
const trade_1 = __importDefault(require("./routes/trade"));
const leaderboard_1 = __importDefault(require("./routes/leaderboard"));
app.use('/api/auth', auth_1.default);
app.use('/api/portfolio', portfolio_1.default);
app.use('/api/trade', trade_1.default);
app.use('/api/leaderboard', leaderboard_1.default);
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
        await (0, db_1.initDb)();
        // 2. Start the Price Cron Job
        (0, priceCron_1.startPriceCron)(io);
        // 3. Start listening for incoming requests
        httpServer.listen(port, () => {
            console.log(`🚀 Server is running on http://localhost:${port}`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
