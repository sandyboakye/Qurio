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
                foreign key (qr_code_id) references qr_codes (id)
            )
        `);

        // Users Table
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE,
                password TEXT,
                role TEXT DEFAULT 'user',
                is_active INTEGER DEFAULT 1,
                max_qrs INTEGER DEFAULT 10,
                has_enterprise INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Migration: Add user_id to qr_codes if missing
        db.all("PRAGMA table_info(qr_codes)", (err, rows) => {
            const hasUserId = rows.some(r => r.name === 'user_id');
            if (!hasUserId) {
                db.run("ALTER TABLE qr_codes ADD COLUMN user_id INTEGER", (err) => {
                    if (err) console.error("Migration Error (user_id):", err);
                    else console.log("Migration: Added user_id to qr_codes");
                });
            }
        });

        // Migration: Add columns to users if missing
        db.all("PRAGMA table_info(users)", (err, rows) => {
            const hasIsActive = rows.some(r => r.name === 'is_active');
            if (!hasIsActive) {
                db.run("ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1");
            }

            const hasMaxQrs = rows.some(r => r.name === 'max_qrs');
            if (!hasMaxQrs) {
                db.run("ALTER TABLE users ADD COLUMN max_qrs INTEGER DEFAULT 10", (err) => {
                    if (!err) console.log("Migration: Added max_qrs to users");
                });
            }

            const hasEnterprise = rows.some(r => r.name === 'has_enterprise');
            if (!hasEnterprise) {
                db.run("ALTER TABLE users ADD COLUMN has_enterprise INTEGER DEFAULT 0", (err) => {
                    if (!err) console.log("Migration: Added has_enterprise to users");
                });
            }
        });

        // Index for faster lookups
        db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);

        // Migration: Add user_id to qr_codes if missing
        db.all("PRAGMA table_info(qr_codes)", (err, rows) => {
            if (err) return console.error("Error checking schema:", err);
            const hasUserId = rows.some(r => r.name === 'user_id');
            if (!hasUserId) {
                console.log("Migrating: Adding user_id to qr_codes...");
                db.run("ALTER TABLE qr_codes ADD COLUMN user_id INTEGER");
            }
        });

        db.run(`CREATE INDEX IF NOT EXISTS idx_short_code ON qr_codes(short_code)`);
    });
};

module.exports = { db, initDatabase };
