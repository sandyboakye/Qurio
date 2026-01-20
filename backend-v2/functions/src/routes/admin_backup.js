const express = require('express');
const router = express.Router();
const db = require('../database/db'); // Knex instance
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// Middleware: All routes here require Admin role
router.use(authenticateToken, authorizeAdmin);

// GET /api/admin/users - List all users
router.get('/users', async (req, res) => {
    try {
        // Include is_active, max_qrs, has_enterprise, and qr_count
        const users = await db('users as u')
            .leftJoin('qr_codes as q', 'u.id', 'q.user_id')
            .groupBy('u.id')
            .orderBy('u.created_at', 'desc')
            .select(
                'u.id', 'u.email', 'u.role', 'u.is_active', 'u.max_qrs', 'u.has_enterprise', 'u.created_at',
                db.raw('count(q.id) as qr_count')
            );

        // Normalize boolean fields for consistency if needed
        const normalizedUsers = users.map(u => ({
            ...u,
            is_active: !!u.is_active,
            has_enterprise: !!u.has_enterprise
        }));

        res.json(normalizedUsers);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Database error' });
    }
});

// DELETE /api/admin/users/:id - Delete a user
router.delete('/users/:id', async (req, res) => {
    const userId = req.params.id;

    if (parseInt(userId) === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    try {
        const count = await db('users').where({ id: userId }).del();
        if (count === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User deleted successfully' });
    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Toggle User Status
router.put('/users/:id/status', async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body; // Expect boolean or 0/1

    if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: 'Cannot deactivate yourself' });
    }

    try {
        await db('users').where({ id }).update({ is_active: is_active ? 1 : 0 });
        res.json({ message: 'User status updated', is_active });
    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Reset Password
router.put('/users/:id/password', async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db('users').where({ id }).update({ password: hashedPassword });
        res.json({ message: 'Password reset successfully' });
    } catch (e) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update User Limits
router.put('/users/:id/limits', async (req, res) => {
    const { id } = req.params;
    const { max_qrs, has_enterprise } = req.body;

    try {
        await db('users').where({ id }).update({
            max_qrs,
            has_enterprise: has_enterprise ? 1 : 0
        });
        res.json({ message: 'User limits updated' });
    } catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
});

// GET /api/admin/stats - Platform Overview
router.get('/stats', async (req, res) => {
    try {
        const [userCount, qrCount, scanCount] = await Promise.all([
            db('users').count('* as count').first(),
            db('qr_codes').count('* as count').first(),
            db('scans').count('* as count').first()
        ]);

        res.json({
            total_users: parseInt(userCount.count),
            total_qrs: parseInt(qrCount.count),
            total_scans: parseInt(scanCount.count)
        });
    } catch (e) {
        res.status(500).json({ error: 'DB Error' });
    }
});

module.exports = router;

