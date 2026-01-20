const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
// const { initDatabase } = require('./database/init'); // Legacy Removed
const db = require('./database/db'); // Test/Init connection
const qrRoutes = require('./routes/qr');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/admin');
const supportRoutes = require('./routes/support');
const UAParser = require('ua-parser-js');

const app = express();

// Middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/support', supportRoutes);

// Redirect Route (Short URL)
app.get('/r/:shortCode', async (req, res) => {
    const { shortCode } = req.params;

    try {
        const row = await db('qr_codes')
            .where({ short_code: shortCode })
            .select('original_url', 'current_url', 'id', 'is_active')
            .first();

        if (!row) {
            return res.status(404).send(`
                <div style="font-family: sans-serif; text-align: center; padding: 50px;">
                    <h1>QR Code Not Found</h1>
                    <p>The code you scanned does not exist or has been deleted.</p>
                </div>
            `);
        }

        if (!row.is_active) {
            return res.status(403).send(`
                <div style="font-family: sans-serif; text-align: center; padding: 50px;">
                    <h1>Campaign Inactive</h1>
                    <p>This QR code is currently paused by the owner.</p>
                </div>
            `);
        }

        // Async analytics logging (fire and forget somewhat)
        // We don't await this to keep redirect fast
        (async () => {
            try {
                const ua = UAParser(req.headers['user-agent']);
                const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
                let deviceType = ua.device.type || 'desktop';

                await db('qr_codes').where({ id: row.id }).increment('scan_count', 1);

                await db('scans').insert({
                    qr_code_id: row.id,
                    ip_address: ip,
                    user_agent: req.headers['user-agent'],
                    device_type: deviceType,
                    country: 'Unknown',
                    browser: ua.browser.name || 'Unknown',
                    os: ua.os.name || 'Unknown',
                    scanned_at: db.fn.now()
                });
            } catch (err) {
                console.error("Analytics Log Error", err);
            }
        })();

        res.redirect(row.current_url);

    } catch (e) {
        console.error("Redirect Error", e);
        res.status(500).send("Server Error");
    }
});


app.get('/health', (req, res) => {
    res.json({ status: 'OK', version: '2.0.0', db: 'Knex' });
});

module.exports = app;
