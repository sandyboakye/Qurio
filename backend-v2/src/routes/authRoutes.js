const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db'); // Knex instance
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

// REGISTER
router.post('/register', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // Determine role: First user is Admin, others are Users
        const countResult = await db('users').count('id as count').first();
        const role = parseInt(countResult.count) === 0 ? 'admin' : 'user';

        const [id] = await db('users').insert({
            email,
            password: hashedPassword,
            role
        }).returning('id'); // PG returns array of objects/ids, knex sqlite handles it generally

        // Handle Knex varying return types for inserts
        const userId = typeof id === 'object' ? id.id : id;

        const user = { id: userId, email, role };
        const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user
        });

    } catch (e) {
        if (e.message.includes('UNIQUE constraint failed') || e.code === '23505') { // 23505 is PG unique violation
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Error registering user' });
    }
});

// LOGIN
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const user = await db('users').where({ email }).first();

        if (!user) return res.status(400).json({ error: 'Invalid credentials' });

        if (!user.is_active) {
            return res.status(403).json({ error: 'Account deactivated. Contact admin.' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });

        const tokenPayload = {
            id: user.id,
            email: user.email,
            role: user.role,
            max_qrs: user.max_qrs,
            has_enterprise: !!user.has_enterprise
        };
        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                max_qrs: user.max_qrs,
                has_enterprise: !!user.has_enterprise
            }
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Database error' });
    }
});

// GET CURRENT USER
router.get('/me', authenticateToken, (req, res) => {
    // Return user info from token (or DB if more data needed)
    res.json(req.user);
});

module.exports = router;

