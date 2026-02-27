import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false,
});

/**
 * Initializes the database by creating necessary tables if they don't exist.
 */
export const initDb = async () => {
    const client = await pool.connect();
    try {
        console.log('Connected to database, initializing schema...');

        // Create the market_prices table
        await client.query(`
      CREATE TABLE IF NOT EXISTS market_prices (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(50) NOT NULL,
        price NUMERIC NOT NULL,
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // Create an index for faster queries by symbol and time
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_market_prices_symbol_time 
      ON market_prices (symbol, timestamp DESC);
    `);

        console.log('Schema initialized successfully.');
    } catch (error) {
        console.error('Error initializing database schema:', error);
        throw error;
    } finally {
        client.release();
    }
};

export const query = (text: string, params?: any[]) => {
    return pool.query(text, params);
};

export default pool;
