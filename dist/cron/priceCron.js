"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startPriceCron = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const marketFetcher_1 = require("../services/marketFetcher");
const db_1 = require("../db");
/**
 * Initialize and start the cron job to fetch prices every 15 seconds.
 *
 * @param io The Socket.io server instance to emit price updates to clients.
 */
const startPriceCron = (io) => {
    console.log('Starting price fetch cron job (runs every 15 seconds)...');
    // '*/15 * * * * *' means run every 15th second.
    node_cron_1.default.schedule('*/15 * * * * *', async () => {
        try {
            const marketDataArray = await (0, marketFetcher_1.fetchIndianMarketPrices)();
            for (const marketData of marketDataArray) {
                // Save the fetched price to the PostgreSQL database
                const result = await (0, db_1.query)(`INSERT INTO market_prices (symbol, price, timestamp) 
             VALUES ($1, $2, $3) RETURNING *`, [marketData.symbol, marketData.price, marketData.timestamp]);
                const savedRecord = result.rows[0];
                console.log(`[Cron] Inserted new price for ${savedRecord.symbol}: ₹${savedRecord.price}`);
                // Emit the new price to all connected Socket.io clients
                io.emit('price_update', savedRecord);
            }
        }
        catch (error) {
            console.error('[Cron] Error during scheduled price fetch:', error);
        }
    });
};
exports.startPriceCron = startPriceCron;
