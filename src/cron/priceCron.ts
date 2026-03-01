import cron from 'node-cron';
import { Server } from 'socket.io';
import { fetchIndianMarketPrices } from '../services/marketFetcher';
import { query } from '../db';

/**
 * Initialize and start the cron job to fetch prices every 15 seconds.
 * 
 * @param io The Socket.io server instance to emit price updates to clients.
 */
export const startPriceCron = (io: Server) => {
    console.log('Starting price fetch cron job (runs every 15 seconds)...');

    // '*/15 * * * * *' means run every 15th second.
    cron.schedule('*/15 * * * * *', async () => {
        try {
            const marketDataArray = await fetchIndianMarketPrices();

            for (const marketData of marketDataArray) {
                // Save the fetched price to the PostgreSQL database
                const result = await query(
                    `INSERT INTO market_prices (symbol, price, timestamp) 
             VALUES ($1, $2, $3) RETURNING *`,
                    [marketData.symbol, marketData.price, marketData.timestamp]
                );

                const savedRecord = result.rows[0];
                console.log(`[Cron] Inserted new price for ${savedRecord.symbol}: ₹${savedRecord.price}`);

                // Emit the new price to all connected Socket.io clients
                io.emit('price_update', savedRecord);
            }

        } catch (error) {
            console.error('[Cron] Error during scheduled price fetch:', error);
        }
    });
};
