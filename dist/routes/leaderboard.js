"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("../db");
const auth_1 = require("./auth");
const router = express_1.default.Router();
// GET /api/leaderboard
router.get('/', auth_1.protect, async (req, res) => {
    try {
        // Calculate the "Net Worth" of every user
        // Net Worth = fiat_balance + SUM(holding_quantity * latest_market_price)
        // 1. Fetch the latest market prices for each symbol
        const latestPricesRes = await (0, db_1.query)(`
            SELECT DISTINCT ON (symbol) symbol, price
            FROM market_prices
            ORDER BY symbol, timestamp DESC
        `);
        // Map them for easy lookup
        const currentPrices = {};
        latestPricesRes.rows.forEach(row => {
            currentPrices[row.symbol] = parseFloat(row.price);
        });
        // 2. Fetch all users and their fiat balances
        const usersRes = await (0, db_1.query)('SELECT id, username, fiat_balance FROM users');
        const users = usersRes.rows.map(u => ({
            id: u.id,
            username: u.username,
            fiatBalance: parseFloat(u.fiat_balance),
            holdingsValue: 0,
            netWorth: 0
        }));
        // 3. Fetch all portfolios (holdings > 0)
        const portfoliosRes = await (0, db_1.query)('SELECT user_id, symbol, quantity FROM portfolios WHERE quantity > 0');
        // 4. Calculate total holdings value
        portfoliosRes.rows.forEach(row => {
            const userIndex = users.findIndex(u => u.id === row.user_id);
            if (userIndex !== -1) {
                const qty = parseFloat(row.quantity);
                const currentPrice = currentPrices[row.symbol] || 0;
                users[userIndex].holdingsValue += (qty * currentPrice);
            }
        });
        // 5. Compute net worth and sort descending
        users.forEach(u => {
            u.netWorth = u.fiatBalance + u.holdingsValue;
        });
        users.sort((a, b) => b.netWorth - a.netWorth);
        // Fetch top 100 users for the leaderboard
        const top100 = users.slice(0, 100).map(u => ({
            username: u.username,
            net_worth: u.netWorth
        }));
        res.json(top100);
    }
    catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: 'Failed to generate leaderboard' });
    }
});
exports.default = router;
