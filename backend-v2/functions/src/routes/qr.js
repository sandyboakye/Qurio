const express = require('express');
const QRCode = require('qrcode');
const { createCanvas, loadImage } = require('canvas');
const db = require('../database/db'); // Knex instance
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Protect all QR routes
router.use(authenticateToken);

// Multer Setup
const upload = multer({ storage: multer.memoryStorage() });

// Helpers
const generateShortCode = () => uuidv4().slice(0, 8);

const generateQRBuffer = async (text, colorDark = '#000000', colorLight = '#ffffff') => {
    return await QRCode.toBuffer(text, {
        color: {
            dark: colorDark,
            light: colorLight
        },
        width: 300,
        margin: 1
    });
};

const generateQRWithLogo = async (text, colorDark, colorLight, logoBase64) => {
    const qrBuffer = await QRCode.toBuffer(text, {
        color: {
            dark: colorDark,
            light: colorLight
        },
        width: 300,
        margin: 1,
        errorCorrectionLevel: 'H'
    });

    if (!logoBase64) {
        return `data:image/png;base64,${qrBuffer.toString('base64')}`;
    }

    try {
        const canvas = createCanvas(300, 300);
        const ctx = canvas.getContext('2d');
        const qrImage = await loadImage(qrBuffer);

        ctx.drawImage(qrImage, 0, 0, 300, 300);

        const logo = await loadImage(logoBase64);
        const logoSize = 60;
        const logoPos = (300 - logoSize) / 2;

        ctx.fillStyle = colorLight || '#ffffff';
        ctx.fillRect(logoPos - 2, logoPos - 2, logoSize + 4, logoSize + 4);

        ctx.drawImage(logo, logoPos, logoPos, logoSize, logoSize);
        return canvas.toDataURL();
    } catch (e) {
        console.warn("Invalid logo image, returning basic QR:", e.message);
        return `data:image/png;base64,${qrBuffer.toString('base64')}`;
    }
};

// Bulk Create QR Codes
router.post('/bulk', upload.single('file'), async (req, res) => {
    try {
        if (req.user.role !== 'admin' && !req.user.has_enterprise) {
            return res.status(403).json({ error: 'Enterprise feature. Please upgrade.' });
        }

        if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded' });

        const records = parse(req.file.buffer, { columns: true, skip_empty_lines: true });
        if (records.length === 0) return res.status(400).json({ error: 'CSV is empty' });

        const archive = archiver('zip', { zlib: { level: 9 } });
        res.attachment(`qurio_bulk_${Date.now()}.zip`);
        archive.pipe(res);

        const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:3001';
        const userId = req.user.id;

        const qrInserts = [];

        for (const row of records) {
            const name = row.name || 'Untitled QR';
            const targetUrl = row.target_url;
            if (!targetUrl) continue;

            const colorDark = row.color_dark || '#000000';
            const colorLight = row.color_light || '#ffffff';

            const shortCode = uuidv4().slice(0, 8);
            const redirectUrl = `${baseUrl}/r/${shortCode}`;

            const qrBuffer = await generateQRBuffer(redirectUrl, colorDark, colorLight);

            const safeName = name.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
            archive.append(qrBuffer, { name: `${safeName}_${shortCode}.png` });

            qrInserts.push({
                short_code: shortCode,
                name: name,
                original_url: targetUrl,
                current_url: targetUrl,
                qr_image_url: `data:image/png;base64,${qrBuffer.toString('base64')}`,
                color_dark: colorDark,
                color_light: colorLight,
                user_id: userId,
                created_at: db.fn.now()
            });
        }

        // Bulk insert capable
        if (qrInserts.length > 0) {
            // Chunk inserts to avoid query size limits
            const chunkSize = 50;
            for (let i = 0; i < qrInserts.length; i += chunkSize) {
                await db('qr_codes').insert(qrInserts.slice(i, i + chunkSize));
            }
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

        // Enforce Limits
        if (req.user.role !== 'admin') {
            const limit = req.user.max_qrs || 10;
            const countResult = await db('qr_codes')
                .where({ user_id: req.user.id })
                .count('id as count')
                .first();

            const currentCount = parseInt(countResult.count);

            if (currentCount >= limit) {
                return res.status(403).json({ error: `Limit reached (${limit} QRs). Contact Admin to upgrade.` });
            }
        }

        const shortCode = generateShortCode();
        const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:3001';
        const redirectUrl = `${baseUrl}/r/${shortCode}`;

        const qrDataUrl = await generateQRWithLogo(redirectUrl, colorDark, colorLight, logoImage);

        const [id] = await db('qr_codes').insert({
            short_code: shortCode,
            name,
            original_url: url,
            current_url: url,
            qr_image_url: qrDataUrl,
            color_dark: colorDark,
            color_light: colorLight,
            logo_image: logoImage,
            user_id: req.user.id,
            created_at: db.fn.now()
        }).returning('id'); // .returning() works for PG, for Sqlite knex handles getting [id] back

        // If SQLite returns an object with result property, we handle it automatically usually
        // But destruct ring [id] is safe for modern knex sqlite3/pg.

        res.json({
            id: typeof id === 'object' ? id.id : id, // Handle varied return formats carefully
            shortCode,
            name,
            currentUrl: url,
            qrImageUrl: qrDataUrl,
            scanCount: 0,
            colorDark,
            colorLight,
            logoImage,
            userId: req.user.id
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server Error' });
    }
});

// List QRs
router.get('/', async (req, res) => {
    try {
        const { limit, offset } = req.query;

        let query = db('qr_codes')
            .where({ user_id: req.user.id })
            .orderBy('created_at', 'desc');

        if (limit) query = query.limit(parseInt(limit));
        if (offset) query = query.offset(parseInt(offset));

        // Optimization: If listing many, maybe exclude the huge image URL unless needed?
        // But frontend assumes it exists. We'll leave it for now, relying on 'limit' to reduce load.

        const rows = await query;

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
    } catch (e) {
        console.error('List Error', e);
        res.status(500).json({ error: 'DB Error' });
    }
});

// Update QR
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { currentUrl, isActive, colorDark, colorLight, logoImage } = req.body;

    try {
        const row = await db('qr_codes')
            .where({ id, user_id: req.user.id })
            .first();

        if (!row) return res.status(404).json({ error: 'QR Code not found or access denied' });

        const updates = {};
        const newColorDark = colorDark || row.color_dark;
        const newColorLight = colorLight || row.color_light;
        const newLogoImage = (logoImage !== undefined) ? logoImage : row.logo_image;

        const shouldRegenerate = (colorDark && colorDark !== row.color_dark) ||
            (colorLight && colorLight !== row.color_light) ||
            (logoImage !== undefined && logoImage !== row.logo_image);

        if (shouldRegenerate) {
            const baseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:3001`;
            const redirectUrl = `${baseUrl}/r/${row.short_code}`;
            const qrDataUrl = await generateQRWithLogo(redirectUrl, newColorDark, newColorLight, newLogoImage);
            updates.qr_image_url = qrDataUrl;
        }

        if (currentUrl) updates.current_url = currentUrl;
        if (isActive !== undefined) updates.is_active = isActive ? 1 : 0;
        if (colorDark) updates.color_dark = colorDark;
        if (colorLight) updates.color_light = colorLight;
        if (logoImage !== undefined) updates.logo_image = logoImage;

        if (Object.keys(updates).length > 0) {
            await db('qr_codes')
                .where({ id, user_id: req.user.id })
                .update(updates);
            res.json({ success: true });
        } else {
            res.json({ success: true, message: 'No changes' });
        }
    } catch (e) {
        console.error("Update Error", e);
        res.status(500).json({ error: 'Update Failed' });
    }
});

// Delete QR
router.delete('/:id', async (req, res) => {
    try {
        const count = await db('qr_codes')
            .where({ id: req.params.id, user_id: req.user.id })
            .del();

        if (count === 0) return res.status(404).json({ error: 'QR Code not found or access denied' });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'DB Error' });
    }
});

// Export Single QR Analytics
router.get('/:id/export', async (req, res) => {
    try {
        const row = await db('qr_codes')
            .where({ id: req.params.id, user_id: req.user.id })
            .select('id')
            .first();

        if (!row) return res.status(403).json({ error: 'Access denied' });

        const rows = await db('scans')
            .where({ qr_code_id: req.params.id })
            .orderBy('scanned_at', 'desc')
            .select('scanned_at', 'ip_address', 'country', 'city', 'device_type', 'browser', 'os');

        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: 'DB Error' });
    }
});

// Get Analytics Stats (Single QR)
router.get('/:id/stats', async (req, res) => {
    const { id } = req.params;

    try {
        const row = await db('qr_codes')
            .where({ id, user_id: req.user.id })
            .select('id')
            .first();

        if (!row) return res.status(403).json({ error: 'Access denied' });

        // Parallel Queries
        const [scansOverTime, deviceDistribution, osDistribution] = await Promise.all([
            db('scans')
                .select(db.raw('date(scanned_at) as date'), db.raw('count(*) as count'))
                .where({ qr_code_id: id })
                .groupByRaw('date(scanned_at)')
                .orderBy('date', 'desc')
                .limit(7),

            db('scans')
                .select('device_type', db.raw('count(*) as count'))
                .where({ qr_code_id: id })
                .groupBy('device_type'),

            db('scans')
                .select('os', db.raw('count(*) as count'))
                .where({ qr_code_id: id })
                .groupBy('os')
        ]);

        res.json({
            scansOverTime: scansOverTime.reverse(),
            deviceDistribution,
            osDistribution
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'DB Error' });
    }
});

// Export All Analytics
router.get('/analytics/export', async (req, res) => {
    try {
        const rows = await db('scans')
            .join('qr_codes', 'scans.qr_code_id', 'qr_codes.id')
            .where('qr_codes.user_id', req.user.id)
            .orderBy('scans.scanned_at', 'desc')
            .select(
                'scans.scanned_at',
                'qr_codes.name as qr_name',
                'qr_codes.current_url',
                'scans.ip_address',
                'scans.country',
                'scans.city',
                'scans.device_type',
                'scans.browser',
                'scans.os'
            );

        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: 'DB Error' });
    }
});

// Global Analytics API
router.get('/analytics/global', async (req, res) => {
    const userId = req.user.id;
    const isPg = db.client.config.client === 'postgresql' || db.client.config.client === 'pg';

    try {
        // Prepare raw queries based on dialect
        const last30Days = isPg ? "NOW() - INTERVAL '30 days'" : "date('now', '-30 days')";
        const dateSelect = isPg ? "TO_CHAR(scanned_at, 'YYYY-MM-DD')" : "date(scanned_at)";
        const hourSelect = isPg ? "TO_CHAR(scanned_at, 'HH24')" : "strftime('%H', scanned_at)";
        const dateGroup = isPg ? "TO_CHAR(scanned_at, 'YYYY-MM-DD')" : "date(scanned_at)";

        const [
            totalScans,
            totalQRs,
            activeQRs,
            timeData,
            hourlyData,
            deviceData,
            browserData,
            osData,
            recentScansData
        ] = await Promise.all([
            // 1. Total Scans
            db('scans')
                .join('qr_codes', 'scans.qr_code_id', 'qr_codes.id')
                .where('qr_codes.user_id', userId)
                .count('* as count')
                .first(),

            // 2. Total QRs
            db('qr_codes')
                .where({ user_id: userId })
                .count('* as count')
                .first(),

            // 3. Active QRs
            db('qr_codes')
                .where({ user_id: userId, is_active: true })
                .count('* as count')
                .first(),

            // 4. Scans Over Time
            db('scans')
                .join('qr_codes', 'scans.qr_code_id', 'qr_codes.id')
                .where('qr_codes.user_id', userId)
                .andWhereRaw(`scanned_at >= ${last30Days}`)
                .groupByRaw(dateGroup)
                .orderByRaw(`${dateGroup} ASC`)
                .select(db.raw(`${dateSelect} as date`), db.raw('count(*) as count')),

            // 5. Hourly Activity
            db('scans')
                .join('qr_codes', 'scans.qr_code_id', 'qr_codes.id')
                .where('qr_codes.user_id', userId)
                .groupByRaw(hourSelect)
                .orderByRaw(`${hourSelect} ASC`)
                .select(db.raw(`${hourSelect} as hour`), db.raw('count(*) as count')),

            // 6. Device Type
            db('scans')
                .join('qr_codes', 'scans.qr_code_id', 'qr_codes.id')
                .where('qr_codes.user_id', userId)
                .groupBy('scans.device_type')
                .select('scans.device_type as name', db.raw('count(*) as count')),

            // 7. Browser
            db('scans')
                .join('qr_codes', 'scans.qr_code_id', 'qr_codes.id')
                .where('qr_codes.user_id', userId)
                .groupBy('scans.browser')
                .orderBy('count', 'desc')
                .limit(5)
                .select('scans.browser as name', db.raw('count(*) as count')),

            // 8. OS
            db('scans')
                .join('qr_codes', 'scans.qr_code_id', 'qr_codes.id')
                .where('qr_codes.user_id', userId)
                .groupBy('scans.os')
                .orderBy('count', 'desc')
                .limit(5)
                .select('scans.os as name', db.raw('count(*) as count')),

            // 9. Recent Scans
            db('scans')
                .join('qr_codes', 'scans.qr_code_id', 'qr_codes.id')
                .where('qr_codes.user_id', userId)
                .orderBy('scans.scanned_at', 'desc')
                .limit(20)
                .select(
                    'scans.id',
                    'scans.scanned_at',
                    'scans.country',
                    'scans.city',
                    'scans.device_type',
                    'qr_codes.name as qr_name',
                    'qr_codes.id as qr_id'
                )
        ]);

        res.json({
            summary: {
                totalScans: parseInt(totalScans?.count || 0),
                totalQRs: parseInt(totalQRs?.count || 0),
                activeQRs: parseInt(activeQRs?.count || 0)
            },
            charts: {
                scansOverTime: timeData,
                scansByHour: hourlyData.map(h => ({ hour: parseInt(h.hour), count: parseInt(h.count) })),
                devices: deviceData.map(d => ({ name: d.name || 'Desktop', value: parseInt(d.count) })),
                browsers: browserData.map(d => ({ name: d.name, value: parseInt(d.count) })),
                os: osData.map(d => ({ name: d.name, value: parseInt(d.count) }))
            },
            lists: {
                recentScans: recentScansData
            }
        });

    } catch (e) {
        console.error("Global Analytics Error", e);
        res.status(500).json({ error: 'DB Error' });
    }
});

// Analytics API (Single QR)
router.get('/:id/analytics', async (req, res) => {
    const { id } = req.params;
    const isPg = db.client.config.client === 'postgresql' || db.client.config.client === 'pg';

    const last30Days = isPg ? "NOW() - INTERVAL '30 days'" : "date('now', '-30 days')";
    const dateSelect = isPg ? "TO_CHAR(scanned_at, 'YYYY-MM-DD')" : "date(scanned_at)";
    const dateGroup = isPg ? "TO_CHAR(scanned_at, 'YYYY-MM-DD')" : "date(scanned_at)";

    try {
        // Enforce Ownership
        const qrCheck = await db('qr_codes')
            .where({ id, user_id: req.user.id })
            .select('id')
            .first();

        if (!qrCheck) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const [timeData, deviceData, browserData, osData] = await Promise.all([
            db('scans')
                .where({ qr_code_id: id })
                .andWhereRaw(`scanned_at >= ${last30Days}`)
                .groupByRaw(dateGroup)
                .orderByRaw(`${dateGroup} ASC`)
                .select(db.raw(`${dateSelect} as date`), db.raw('count(*) as count')),

            db('scans')
                .where({ qr_code_id: id })
                .groupBy('device_type')
                .select('device_type as name', db.raw('count(*) as count')),

            db('scans')
                .where({ qr_code_id: id })
                .groupBy('browser')
                .orderBy('count', 'desc')
                .limit(5)
                .select('browser as name', db.raw('count(*) as count')),

            db('scans')
                .where({ qr_code_id: id })
                .groupBy('os')
                .orderBy('count', 'desc')
                .limit(5)
                .select('os as name', db.raw('count(*) as count'))
        ]);

        res.json({
            scansOverTime: timeData,
            devices: deviceData.map(d => ({ name: d.name || 'Desktop', value: parseInt(d.count) })),
            browsers: browserData.map(d => ({ name: d.name, value: parseInt(d.count) })),
            os: osData.map(d => ({ name: d.name, value: parseInt(d.count) }))
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'DB Error' });
    }
});

module.exports = router;

