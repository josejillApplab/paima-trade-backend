import axios from 'axios';

/**
 * Interface representing a fetched market price
 */
export interface MarketData {
    symbol: string;
    price: number;
    timestamp: Date;
}

/**
 * Service to fetch market prices.
 * In a real scenario, this would call a live REST API like Yahoo Finance, Alpha Vantage, etc.
 * Since the user hasn't provided a specific API, we'll randomize a standard price.
 */
export const fetchIndianMarketPrice = async (symbol: string = 'NIFTY50'): Promise<MarketData> => {
    try {
        // If you have a real API endpoint, replace this logic with an axios call:
        // const response = await axios.get(`https://real-market-api.com/prices?symbol=${symbol}`);
        // return {
        //   symbol: response.data.symbol,
        //   price: response.data.price,
        //   timestamp: new Date()
        // };

        // MOCK DATA GENERATION
        // We start with a base price for NIFTY50 around 22000
        const basePrice = symbol === 'NIFTY50' ? 22000 : 1000;

        // Generate a random fluctuation between -0.5% and +0.5%
        const fluctuation = (Math.random() - 0.5) * 0.01;
        const currentPrice = basePrice * (1 + fluctuation);

        // Return mock data
        return {
            symbol,
            price: Number(currentPrice.toFixed(2)),
            timestamp: new Date()
        };
    } catch (error) {
        console.error(`Error fetching price for ${symbol}:`, error);
        throw error;
    }
};
