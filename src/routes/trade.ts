import express from 'express';
import { query } from '../db';
import { protect } from './auth';

const router = express.Router();

// POST /api/trade
router.post('/', protect, async (req, res) => {
    try {
        const userId = (req as any).user.id;
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
        const client = await (await import('../db')).default.connect();

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
            const holdingRes = await client.query(
                'SELECT quantity FROM portfolios WHERE user_id = $1 AND symbol = $2 FOR UPDATE',
                [userId, symbol]
            );

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

            } else if (type === 'sell') {
                if (holdingQuantity < qty) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ error: 'Insufficient asset quantity to execute sell order' });
                }

                fiatBalance = Number((fiatBalance + totalCost).toFixed(4));
                holdingQuantity = Number((holdingQuantity - qty).toFixed(4));
            }

            // 4. Record Trade
            const tradeRes = await client.query(
                `INSERT INTO trades (user_id, symbol, type, quantity, price) 
                 VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [userId, symbol, type, qty, prc]
            );

            // 5. Update User Fiat
            await client.query(
                'UPDATE users SET fiat_balance = $1 WHERE id = $2',
                [fiatBalance, userId]
            );

            // 6. Upsert Portfolio Holding
            await client.query(
                `INSERT INTO portfolios (user_id, symbol, quantity) 
                 VALUES ($1, $2, $3) 
                 ON CONFLICT (user_id, symbol) 
                 DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = CURRENT_TIMESTAMP`,
                [userId, symbol, holdingQuantity]
            );

            await client.query('COMMIT');

            res.status(201).json({
                message: 'Trade executed successfully',
                trade: tradeRes.rows[0],
                new_fiat_balance: fiatBalance,
                new_holding: holdingQuantity
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Trade error:', error);
        res.status(500).json({ error: 'Failed to execute trade' });
    }
});

// GET /api/history
router.get('/history', protect, async (req, res) => {
    try {
        const userId = (req as any).user.id;

        const result = await query(
            'SELECT * FROM trades WHERE user_id = $1 ORDER BY timestamp DESC',
            [userId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Fetch trades error:', error);
        res.status(500).json({ error: 'Failed to fetch trade history' });
    }
});

export default router;
