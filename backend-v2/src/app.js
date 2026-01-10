const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { initDatabase } = require('./database/init');
const qrRoutes = require('./routes/qr');
// const analyticsRoutes = require('./routes/analytics');

const app = express();

// Initialize DB
initDatabase();

// Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Allow data-uri images
    crossOriginResourcePolicy: false
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/qr', qrRoutes);
// app.use('/api/analytics', analyticsRoutes);

// Redirect Route (Short URL)
const UAParser = require('ua-parser-js');

// Redirect Route (Short URL)
const { db } = require('./database/init');
app.get('/r/:shortCode', (req, res) => {
    const { shortCode } = req.params;
    db.get('SELECT original_url, current_url, id, is_active FROM qr_codes WHERE short_code = ?', [shortCode], (err, row) => {
        if (err || !row) {
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

        // Async analytics logging
        const ua = UAParser(req.headers['user-agent']);
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress; // Basic IP capture

        // Simple Device Classification
        let deviceType = ua.device.type || 'desktop'; // ua-parser returns undefined for desktop usually

        db.serialize(() => {
            // 1. Increment total scan count
            db.run('UPDATE qr_codes SET scan_count = scan_count + 1 WHERE id = ?', [row.id]);

            // 2. Log detailed scan
            const stmt = db.prepare(`
                INSERT INTO scans (qr_code_id, ip_address, user_agent, device_type, country, browser, os)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            // Note: Country/City would require a GeoIP lookup service (e.g. maxmind), skipping for local dev ease or adding later.
            // Storing 'local' or formatted string for now.
            stmt.run([
                row.id,
                ip,
                req.headers['user-agent'],
                deviceType,
                'Unknown', // GeoIP placeholder
                ua.browser.name || 'Unknown',
                ua.os.name || 'Unknown'
            ]);
            stmt.finalize();
        });

        res.redirect(row.current_url);
    });
});


app.get('/health', (req, res) => {
    res.json({ status: 'OK', version: '2.0.0' });
});

module.exports = app;
