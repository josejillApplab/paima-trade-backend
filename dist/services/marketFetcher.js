"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchIndianMarketPrices = exports.TRACKED_SYMBOLS = void 0;
const stock_nse_india_1 = require("stock-nse-india");
const nseIndia = new stock_nse_india_1.NseIndia();
// Popular Indian Stocks to track
exports.TRACKED_SYMBOLS = [
    'RELIANCE',
    'TCS',
    'HDFCBANK',
    'INFY',
    'SBI'
];
/**
 * Service to fetch real market prices using stock-nse-india.
 */
const fetchIndianMarketPrices = async () => {
    try {
        const marketData = [];
        // Fetch prices sequentially to avoid overwhelming the NSE endpoints
        for (const symbol of exports.TRACKED_SYMBOLS) {
            try {
                const details = await nseIndia.getEquityDetails(symbol);
                if (details && details.priceInfo && details.priceInfo.lastPrice) {
                    marketData.push({
                        symbol,
                        price: Number(details.priceInfo.lastPrice),
                        timestamp: new Date()
                    });
                }
            }
            catch (err) {
                console.error(`Failed to fetch live price for ${symbol}:`, err);
                // Continue fetching other symbols even if one fails
            }
        }
        return marketData;
    }
    catch (error) {
        console.error(`Error in fetchIndianMarketPrices:`, error);
        throw error;
    }
};
exports.fetchIndianMarketPrices = fetchIndianMarketPrices;
