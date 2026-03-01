"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("../db");
const auth_1 = require("./auth");
const router = express_1.default.Router();
// GET /api/portfolio
router.get('/', auth_1.protect, async (req, res) => {
    try {
        const userId = req.user.id;
        // 1. Get Fiat Balance
        const userRes = await (0, db_1.query)('SELECT fiat_balance FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        // 2. Get Coin Holdings
        const holdingsRes = await (0, db_1.query)('SELECT symbol, quantity, updated_at FROM portfolios WHERE user_id = $1 AND quantity > 0', [userId]);
        res.json({
            fiat_balance: parseFloat(userRes.rows[0].fiat_balance),
            holdings: holdingsRes.rows.map(h => ({
                symbol: h.symbol,
                quantity: parseFloat(h.quantity),
                updated_at: h.updated_at
            }))
        });
    }
    catch (error) {
        console.error('Portfolio error:', error);
        res.status(500).json({ error: 'Failed to fetch portfolio' });
    }
});
exports.default = router;
