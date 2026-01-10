const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// DATA DIRECTORY - ABSOLUTE PATH FIX
// We store data in a sibling 'data' directory to the 'src' or 'backend-v2' root
const DATA_DIR = path.join(__dirname, '../../data-v2');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = process.env.DATABASE_PATH || path.join(DATA_DIR, 'qr.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Database connection error:', err.message);
    } else {
        console.log(`✅ Connected to SQLite database at: ${DB_PATH}`);
    }
});

const initDatabase = () => {
    db.serialize(() => {
        // QR Codes Table
        db.run(`
            CREATE TABLE IF NOT EXISTS qr_codes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                short_code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                original_url TEXT NOT NULL,
                current_url TEXT NOT NULL,
                qr_image_url TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT 1,
                scan_count INTEGER DEFAULT 0,
                color_dark TEXT DEFAULT '#000000',
                color_light TEXT DEFAULT '#ffffff',
                logo_image TEXT,
                design_style TEXT DEFAULT 'square'
            )
        `);
        // Note: added scan_count for simpler analytics

        // Analytics/Scans Table
        db.run(`
            CREATE TABLE IF NOT EXISTS scans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                qr_code_id INTEGER,
                ip_address TEXT,
                user_agent TEXT,
                device_type TEXT,
                country TEXT,
                city TEXT,
                browser TEXT,
                os TEXT,
                referrer TEXT,
                scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (qr_code_id) REFERENCES qr_codes (id)
            )
        `);

        db.run(`CREATE INDEX IF NOT EXISTS idx_short_code ON qr_codes(short_code)`);
    });
};

module.exports = { db, initDatabase };
