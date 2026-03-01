"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("../db");
const auth_1 = require("./auth");
const router = express_1.default.Router();
// POST /api/trade
router.post('/', auth_1.protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const { symbol, type, quantity, price } = req.body;
        if (!symbol || !type || !quantity || !price) {
            return res.status(400).json({ error: 'Missing required trade parameters' });
        }
        if (type !== 'buy' && type !== 'sell') {
            return res.status(400).json({ error: 'Type must be buy or sell' });
        }
        const qty = parseFloat(quantity);
        const prc = parseFloat(price);
        const totalCost = qty * prc;
        if (qty <= 0 || prc <= 0) {
            return res.status(400).json({ error: 'Quantity and price must be positive' });
        }
        // --- Execute inside a Transaction ---
        const client = await (await Promise.resolve().then(() => __importStar(require('../db')))).default.connect();
        try {
            await client.query('BEGIN');
            // 1. Get current user balances (lock row to prevent race conditions)
            const userRes = await client.query('SELECT fiat_balance FROM users WHERE id = $1 FOR UPDATE', [userId]);
            if (userRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'User not found' });
            }
            let fiatBalance = parseFloat(userRes.rows[0].fiat_balance);
            // 2. Get current asset holdings
            const holdingRes = await client.query('SELECT quantity FROM portfolios WHERE user_id = $1 AND symbol = $2 FOR UPDATE', [userId, symbol]);
            let holdingQuantity = holdingRes.rows.length > 0 ? parseFloat(holdingRes.rows[0].quantity) : 0;
            // 3. Validation
            const totalCost = Number((qty * prc).toFixed(4));
            console.log(`[Trade] Evaluating order: qty=${qty}, prc=${prc}, totalCost=${totalCost}`);
            console.log(`[Trade] User balances: fiatBalance=${fiatBalance}, holdingQuantity=${holdingQuantity}`);
            if (type === 'buy') {
                if (fiatBalance < totalCost) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ error: 'Insufficient fiat balance to execute buy order' });
                }
                fiatBalance = Number((fiatBalance - totalCost).toFixed(4));
                holdingQuantity = Number((holdingQuantity + qty).toFixed(4));
            }
            else if (type === 'sell') {
                if (holdingQuantity < qty) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ error: 'Insufficient asset quantity to execute sell order' });
                }
                fiatBalance = Number((fiatBalance + totalCost).toFixed(4));
                holdingQuantity = Number((holdingQuantity - qty).toFixed(4));
            }
            // 4. Record Trade
            const tradeRes = await client.query(`INSERT INTO trades (user_id, symbol, type, quantity, price) 
                 VALUES ($1, $2, $3, $4, $5) RETURNING *`, [userId, symbol, type, qty, prc]);
            // 5. Update User Fiat
            await client.query('UPDATE users SET fiat_balance = $1 WHERE id = $2', [fiatBalance, userId]);
            // 6. Upsert Portfolio Holding
            await client.query(`INSERT INTO portfolios (user_id, symbol, quantity) 
                 VALUES ($1, $2, $3) 
                 ON CONFLICT (user_id, symbol) 
                 DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = CURRENT_TIMESTAMP`, [userId, symbol, holdingQuantity]);
            await client.query('COMMIT');
            res.status(201).json({
                message: 'Trade executed successfully',
                trade: tradeRes.rows[0],
                new_fiat_balance: fiatBalance,
                new_holding: holdingQuantity
            });
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('Trade error:', error);
        res.status(500).json({ error: 'Failed to execute trade' });
    }
});
// GET /api/history
router.get('/history', auth_1.protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await (0, db_1.query)('SELECT * FROM trades WHERE user_id = $1 ORDER BY timestamp DESC', [userId]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Fetch trades error:', error);
        res.status(500).json({ error: 'Failed to fetch trade history' });
    }
});
exports.default = router;
