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
            role,
            name: req.body.name || ''
        }).returning('id'); // PG returns array of objects/ids, knex sqlite handles it generally

        // Handle Knex varying return types for inserts
        const userId = typeof id === 'object' ? id.id : id;

        const user = { id: userId, email, role, name: req.body.name || '' };
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
            has_enterprise: !!user.has_enterprise,
            name: user.name
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
                has_enterprise: !!user.has_enterprise,
                name: user.name
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

// UPDATE PROFILE
router.put('/update', authenticateToken, async (req, res) => {
    const { name, email } = req.body;
    try {
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (email !== undefined) updates.email = email;

        if (Object.keys(updates).length > 0) {
            await db('users').where({ id: req.user.id }).update(updates);

            const updatedUser = await db('users').where({ id: req.user.id }).first();
            const tokenPayload = {
                id: updatedUser.id,
                email: updatedUser.email,
                role: updatedUser.role,
                max_qrs: updatedUser.max_qrs,
                has_enterprise: !!updatedUser.has_enterprise,
                name: updatedUser.name
            };
            const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

            res.json({ success: true, user: tokenPayload, token });
        } else {
            res.json({ success: true, message: 'No changes' });
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Update failed' });
    }
});


// FIREBASE LOGIN
router.post('/firebase', async (req, res) => {
    const { idToken } = req.body;

    if (!idToken) {
        return res.status(400).json({ error: 'ID Token required' });
    }

    try {
        // Verify Firebase Token
        const decodedToken = await require('../firebaseAdmin').auth().verifyIdToken(idToken);
        const { email, name, picture, email_verified } = decodedToken;

        if (!email) {
            return res.status(400).json({ error: 'Account has no email' });
        }

        if (!email_verified) {
            return res.status(403).json({ error: 'Please verify your email address to continue.' });
        }

        // Check if user exists
        let user = await db('users').where({ email }).first();

        if (!user) {
            // Create user (Passwordless / Random Password)
            const countResult = await db('users').count('id as count').first();
            const role = parseInt(countResult.count) === 0 ? 'admin' : 'user';

            // Random password placeholder (they can't login with password unless they reset it)
            const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
            const hashedPassword = await bcrypt.hash(randomPassword, 10);

            const [id] = await db('users').insert({
                email,
                password: hashedPassword,
                role,
                name: name || '',
                is_active: true
            }).returning('id');

            const userId = typeof id === 'object' ? id.id : id;
            user = { id: userId, email, role, name: name || '', is_active: true };
        }

        if (!user.is_active) {
            return res.status(403).json({ error: 'Account deactivated. Contact admin.' });
        }

        // Generate JWT
        const tokenPayload = {
            id: user.id,
            email: user.email,
            role: user.role,
            max_qrs: user.max_qrs,
            has_enterprise: !!user.has_enterprise,
            name: user.name
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
                has_enterprise: !!user.has_enterprise,
                name: user.name,
                picture
            }
        });

    } catch (e) {
        console.error('Google Auth Error:', e);
        // RETURN ERROR MESSAGE FOR DEBUGGING (Remove in production later)
        res.status(401).json({ error: `Invalid Google Token: ${e.message}` });
    }
});

// CHANGE PASSWORD (Legacy Users)
router.post('/change-password', authenticateToken, async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ error: 'Old and new passwords are required' });
    }

    try {
        const user = await db('users').where({ id: req.user.id }).first();
        if (!user) return res.status(404).json({ error: 'User not found' });

        // If user has no password (e.g. Google user tried to use this route), block it
        if (!user.password) {
            return res.status(400).json({ error: 'This account uses Google Sign-In. Please manage your security via Google.' });
        }

        const validPassword = await bcrypt.compare(oldPassword, user.password);
        if (!validPassword) return res.status(400).json({ error: 'Incorrect current password' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db('users').where({ id: req.user.id }).update({ password: hashedPassword });

        res.json({ message: 'Password updated successfully' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to update password' });
    }
});

// DELETE ACCOUNT
router.delete('/delete-account', authenticateToken, async (req, res) => {
    try {
        await db('users').where({ id: req.user.id }).del();
        // Note: Cascading deletes should handle related data (scans, qrcodes) if configured in DB,
        // otherwise we might need manual cleanup here. Assuming DB handles foreign keys or we accept specific retention.

        res.json({ message: 'Account deleted successfully' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to delete account' });
    }
});


module.exports = router;


