const express = require('express');
const QRCode = require('qrcode');
const { createCanvas, loadImage } = require('canvas');
const { db } = require('../database/init');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Multer Setup
const upload = multer({ storage: multer.memoryStorage() });

// Helper: Generate Short Code
const generateShortCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// Helper: Generate QR Image (with optional logo)
const generateQRWithLogo = async (text, colorDark, colorLight, logoUrl) => {
    try {
        // 1. Generate base QR as Data URL
        const qrDataUrl = await QRCode.toDataURL(text, {
            width: 400,
            margin: 1,
            color: {
                dark: colorDark,
                light: colorLight
            },
            errorCorrectionLevel: 'H' // High error correction for logo
        });

        // If no logo, return standard QR
        if (!logoUrl) return qrDataUrl;

        // 2. Composite Logo
        const canvas = createCanvas(400, 400);
        const ctx = canvas.getContext('2d');

        // Load QR
        const qrImage = await loadImage(qrDataUrl);
        ctx.drawImage(qrImage, 0, 0, 400, 400);

        // Load Logo (handle base64 or url)
        // If logoUrl is a data string, loadImage works.
        const logo = await loadImage(logoUrl);

        // Calculate logo size (e.g., 20% of QR size)
        const logoSize = 80;
        const logoX = (400 - logoSize) / 2;
        const logoY = (400 - logoSize) / 2;

        // Draw white background for logo (optional, for visibility)
        ctx.fillStyle = colorLight;
        // Circular or Square background? Square for now.
        // ctx.fillRect(logoX - 5, logoY - 5, logoSize + 10, logoSize + 10);

        // Draw Logo
        ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);

        return canvas.toDataURL(); // Returns "data:image/png;base64,..."
    } catch (err) {
        console.error("QR Generation Error:", err);
        throw err;
    }
};

// Helper to generate QR Buffer (for bulk download)
async function generateQRBuffer(url, colorDark = '#000000', colorLight = '#ffffff') {
    return await QRCode.toBuffer(url, {
        color: {
            dark: colorDark,
            light: colorLight
        },
        width: 300,
        margin: 2
    });
}

// Bulk Create QR Codes
router.post('/bulk', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded' });

        const records = parse(req.file.buffer, { columns: true, skip_empty_lines: true });
        if (records.length === 0) return res.status(400).json({ error: 'CSV is empty' });

        const archive = archiver('zip', { zlib: { level: 9 } });
        res.attachment(`qurio_bulk_${Date.now()}.zip`);
        archive.pipe(res);

        const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:3001';

        for (const row of records) {
            const name = row.name || 'Untitled QR';
            const targetUrl = row.target_url;
            if (!targetUrl) continue; // Skip invalid rows

            const colorDark = row.color_dark || '#000000';
            const colorLight = row.color_light || '#ffffff';

            const shortCode = uuidv4().slice(0, 8); // Simple unique code
            const redirectUrl = `${baseUrl}/r/${shortCode}`;

            // Generate QR Image Buffer
            const qrBuffer = await generateQRBuffer(redirectUrl, colorDark, colorLight);

            // Add to Zip
            const safeName = name.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
            archive.append(qrBuffer, { name: `${safeName}_${shortCode}.png` });

            // Insert into Database
            await new Promise((resolve, reject) => {
                const sql = `INSERT INTO qr_codes (short_code, name, original_url, current_url, qr_image_url, color_dark, color_light, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`;
                const base64Img = `data:image/png;base64,${qrBuffer.toString('base64')}`;

                // Using db.run from imported db object which is usually the db instance directly or a wrapper?
                // The import was `const { db } = require('../database/init');` 
                // Let's assume db.run exists.
                db.run(sql, [shortCode, name, targetUrl, targetUrl, base64Img, colorDark, colorLight], (err) => {
                    if (err) console.error("Bulk Insert Error", err);
                    resolve();
                });
            });
        }

        await archive.finalize();

    } catch (e) {
        console.error("Bulk Process Error", e);
        if (!res.headersSent) res.status(500).json({ error: 'Bulk insertion failed' });
    }
});

// Create QR
router.post('/create', async (req, res) => {
    try {
        const { name, url, colorDark = '#000000', colorLight = '#ffffff', logoImage } = req.body;
        if (!name || !url) return res.status(400).json({ error: 'Name and URL required' });

        const shortCode = generateShortCode();
        const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:3001';
        const redirectUrl = `${baseUrl}/r/${shortCode}`;

        // Generate QR Image (Base64) with Custom Colors & Logo
        const qrDataUrl = await generateQRWithLogo(redirectUrl, colorDark, colorLight, logoImage);

        const stmt = db.prepare(`
            INSERT INTO qr_codes (short_code, name, original_url, current_url, qr_image_url, color_dark, color_light, logo_image)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run([shortCode, name, url, url, qrDataUrl, colorDark, colorLight, logoImage], function (err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'DB Error' });
            }
            res.json({
                id: this.lastID,
                shortCode,
                name,
                currentUrl: url,
                qrImageUrl: qrDataUrl,
                scanCount: 0,
                colorDark,
                colorLight,
                logoImage
            });
        });
        stmt.finalize();

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server Error' });
    }
});

// List QRs
router.get('/', (req, res) => {
    db.all(`SELECT * FROM qr_codes ORDER BY created_at DESC`, (err, rows) => {
        if (err) return res.status(500).json({ error: 'DB Error' });

        const qrs = rows.map(row => ({
            id: row.id,
            shortCode: row.short_code,
            name: row.name,
            originalUrl: row.original_url,
            currentUrl: row.current_url,
            qrImageUrl: row.qr_image_url,
            createdAt: row.created_at,
            isActive: !!row.is_active,
            scanCount: row.scan_count,
            colorDark: row.color_dark,
            colorLight: row.color_light
        }));

        res.json(qrs);
    });
});

// Update QR
// Update QR
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { currentUrl, isActive, colorDark, colorLight, logoImage } = req.body;

    // First fetch existing to get shortCode (needed for regeneration)
    db.get('SELECT * FROM qr_codes WHERE id = ?', [id], async (err, row) => {
        if (err) return res.status(500).json({ error: 'DB Error' });
        if (!row) return res.status(404).json({ error: 'QR Code not found' });

        try {
            let updates = [];
            let params = [];

            // Determine if we need to regenerate
            const newColorDark = colorDark || row.color_dark;
            const newColorLight = colorLight || row.color_light;
            const newLogoImage = (logoImage !== undefined) ? logoImage : row.logo_image; // Handle removal if empty string passed?

            const shouldRegenerate = (colorDark && colorDark !== row.color_dark) ||
                (colorLight && colorLight !== row.color_light) ||
                (logoImage !== undefined && logoImage !== row.logo_image);

            if (shouldRegenerate) {
                const baseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:3001`;
                const redirectUrl = `${baseUrl}/r/${row.short_code}`;

                const qrDataUrl = await generateQRWithLogo(redirectUrl, newColorDark, newColorLight, newLogoImage);

                updates.push('qr_image_url = ?');
                params.push(qrDataUrl);
            }

            // Standard updates
            if (currentUrl) { updates.push('current_url = ?'); params.push(currentUrl); }
            if (isActive !== undefined) { updates.push('is_active = ?'); params.push(isActive ? 1 : 0); }
            if (colorDark) { updates.push('color_dark = ?'); params.push(colorDark); }
            if (colorLight) { updates.push('color_light = ?'); params.push(colorLight); }
            if (logoImage !== undefined) { updates.push('logo_image = ?'); params.push(logoImage); }

            if (updates.length > 0) {
                params.push(id);
                db.run(`UPDATE qr_codes SET ${updates.join(', ')} WHERE id = ?`, params, function (err) {
                    if (err) return res.status(500).json({ error: 'DB Error' });
                    res.json({ success: true, changes: this.changes });
                });
            } else {
                res.json({ success: true, message: 'No changes' });
            }

        } catch (e) {
            console.error("Update Error", e);
            res.status(500).json({ error: 'Update Failed' });
        }
    });
});

// Delete QR
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM qr_codes WHERE id = ?', [id], function (err) {
        if (err) return res.status(500).json({ error: 'DB Error' });
        res.json({ success: true });
    });
});

// Export Single QR Analytics
router.get('/:id/export', (req, res) => {
    const { id } = req.params;
    const query = `
        SELECT scanned_at, ip_address, country, city, device_type, browser, os 
        FROM scans 
        WHERE qr_code_id = ? 
        ORDER BY scanned_at DESC
    `;

    db.all(query, [id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'DB Error' });
        res.json(rows);
    });
});

// Get Analytics Stats
router.get('/:id/stats', (req, res) => {
    const { id } = req.params;

    const queries = {
        scansOverTime: `
            SELECT date(scanned_at) as date, count(*) as count 
            FROM scans 
            WHERE qr_code_id = ? 
            GROUP BY date(scanned_at) 
            ORDER BY date DESC 
            LIMIT 7
        `,
        deviceDistribution: `
            SELECT device_type, count(*) as count 
            FROM scans 
            WHERE qr_code_id = ? 
            GROUP BY device_type
        `,
        osDistribution: `
            SELECT os, count(*) as count 
            FROM scans 
            WHERE qr_code_id = ? 
            GROUP BY os
        `
    };

    const stats = {};

    // Execute sequentially for simplicity
    db.all(queries.scansOverTime, [id], (err, dates) => {
        if (err) return res.status(500).json({ error: 'DB Error' });
        stats.scansOverTime = dates.reverse(); // Show chronological

        db.all(queries.deviceDistribution, [id], (err, devices) => {
            if (err) return res.status(500).json({ error: 'DB Error' });
            stats.deviceDistribution = devices;

            db.all(queries.osDistribution, [id], (err, os) => {
                if (err) return res.status(500).json({ error: 'DB Error' });
                stats.osDistribution = os;

                res.json(stats);
            });
        });
    });
});

// Export All Analytics
router.get('/analytics/export', (req, res) => {
    const query = `
        SELECT s.scanned_at, q.name as qr_name, q.current_url, 
               s.ip_address, s.country, s.city, s.device_type, s.browser, s.os 
        FROM scans s 
        JOIN qr_codes q ON s.qr_code_id = q.id 
        ORDER BY s.scanned_at DESC
    `;

    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'DB Error' });
        res.json(rows);
    });
});

// Global Analytics API
router.get('/analytics/global', (req, res) => {
    // Parallel Queries
    const queries = {
        totalScans: "SELECT COUNT(*) as count FROM scans",
        totalQRs: "SELECT COUNT(*) as count FROM qr_codes",
        activeQRs: "SELECT COUNT(*) as count FROM qr_codes WHERE is_active = 1",

        // Charts (Platform Wide)
        time: `SELECT date(scanned_at) as date, COUNT(*) as count
               FROM scans
               WHERE scanned_at >= date('now', '-30 days')
               GROUP BY date(scanned_at)
               ORDER BY date(scanned_at) ASC`,

        // Time of Day (Hourly) - SQLite syntax
        hourly: `SELECT strftime('%H', scanned_at) as hour, COUNT(*) as count
                 FROM scans
                 GROUP BY hour
                 ORDER BY hour ASC`,

        device: "SELECT device_type as name, COUNT(*) as count FROM scans GROUP BY device_type",
        browser: "SELECT browser as name, COUNT(*) as count FROM scans GROUP BY browser ORDER BY count DESC LIMIT 5",
        os: "SELECT os as name, COUNT(*) as count FROM scans GROUP BY os ORDER BY count DESC LIMIT 5",

        // Detail Lists for Popups
        recentScans: `SELECT s.id, s.scanned_at, s.country, s.city, s.device_type, q.name as qr_name, q.id as qr_id
                      FROM scans s
                      JOIN qr_codes q ON s.qr_code_id = q.id
                      ORDER BY s.scanned_at DESC LIMIT 20`
    };

    const results = {};

    // Helper for async db.get
    const get = (query) => new Promise((resolve, reject) => {
        db.get(query, [], (err, row) => err ? reject(err) : resolve(row));
    });

    // Helper for async db.all
    const all = (query) => new Promise((resolve, reject) => {
        db.all(query, [], (err, rows) => err ? reject(err) : resolve(rows));
    });

    // Execute all
    Promise.all([
        get(queries.totalScans),
        get(queries.totalQRs),
        get(queries.activeQRs),
        all(queries.time),
        all(queries.hourly),
        all(queries.device),
        all(queries.browser),
        all(queries.os),
        all(queries.recentScans)
    ]).then(([scanCount, qrCount, activeCount, timeData, hourlyData, deviceData, browserData, osData, recentScansData]) => {

        // Process Hourly Data to ensure all 24h are present (optional, but good for charts)
        // For simplicity, we pass raw data and frontend handles gaps or existing data is sufficient.

        res.json({
            summary: {
                totalScans: scanCount?.count || 0,
                totalQRs: qrCount?.count || 0,
                activeQRs: activeCount?.count || 0
            },
            charts: {
                scansOverTime: timeData,
                scansByHour: hourlyData.map(h => ({ hour: parseInt(h.hour), count: h.count })),
                devices: deviceData.map(d => ({ name: d.name || 'Desktop', value: d.count })),
                browsers: browserData.map(d => ({ name: d.name, value: d.count })),
                os: osData.map(d => ({ name: d.name, value: d.count }))
            },
            lists: {
                recentScans: recentScansData
            }
        });
    }).catch(err => {
        console.error("Global Analytics Error", err);
        res.status(500).json({ error: 'DB Error' });
    });
});

// Analytics API
router.get('/:id/analytics', (req, res) => {
    const { id } = req.params;

    // We need multiple aggregations. SQLite doesn't support multiple result sets in one query easily.
    // We'll run them in parallel.

    // 1. Scans Over Time (Last 30 Days)
    const timeQuery = `
        SELECT date(scanned_at) as date, COUNT(*) as count 
        FROM scans 
        WHERE qr_code_id = ? AND scanned_at >= date('now', '-30 days')
        GROUP BY date(scanned_at)
        ORDER BY date(scanned_at) ASC
    `;

    // 2. Device Breakdown
    const deviceQuery = `
        SELECT device_type as name, COUNT(*) as count 
        FROM scans 
        WHERE qr_code_id = ?
        GROUP BY device_type
    `;

    // 3. Browser Breakdown
    const browserQuery = `
        SELECT browser as name, COUNT(*) as count 
        FROM scans 
        WHERE qr_code_id = ?
        GROUP BY browser
        ORDER BY count DESC
        LIMIT 5
    `;

    // 4. OS Breakdown
    const osQuery = `
        SELECT os as name, COUNT(*) as count 
        FROM scans 
        WHERE qr_code_id = ?
        GROUP BY os
        ORDER BY count DESC
        LIMIT 5
    `;

    db.serialize(() => {
        db.all(timeQuery, [id], (err, timeData) => {
            if (err) return res.status(500).json({ error: 'DB Error (Time)' });

            db.all(deviceQuery, [id], (err, deviceData) => {
                if (err) return res.status(500).json({ error: 'DB Error (Device)' });

                db.all(browserQuery, [id], (err, browserData) => {
                    if (err) return res.status(500).json({ error: 'DB Error (Browser)' });

                    db.all(osQuery, [id], (err, osData) => {
                        if (err) return res.status(500).json({ error: 'DB Error (OS)' });

                        // Fill in missing dates for the chart? Frontend can handle logic or we do it here.
                        // Let's send raw data for now.
                        res.json({
                            scansOverTime: timeData,
                            devices: deviceData.map(d => ({ name: d.name || 'Desktop', value: d.count })), // fallback name
                            browsers: browserData.map(d => ({ name: d.name, value: d.count })),
                            os: osData.map(d => ({ name: d.name, value: d.count }))
                        });
                    });
                });
            });
        });
    });
});

module.exports = router;
