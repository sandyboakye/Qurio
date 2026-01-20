const express = require('express');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

// Send a support message
router.post('/', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || message.trim() === '') {
            return res.status(400).json({ error: 'Message cannot be empty' });
        }

        await db('support_messages').insert({
            user_id: req.user.id,
            message: message,
            created_at: db.fn.now()
        });

        res.json({ success: true, message: 'Message sent successfully' });
    } catch (e) {
        console.error("Support Message Error", e);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

module.exports = router;
