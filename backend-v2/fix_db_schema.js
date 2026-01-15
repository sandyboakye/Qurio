const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'data-v2/qr.db');
console.log('Opening DB at:', dbPath);
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // 1. Check Schema
    db.all("PRAGMA table_info(users)", (err, rows) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log('Current Schema:', rows);

        const hasIsActive = rows.some(r => r.name === 'is_active');
        if (!hasIsActive) {
            console.log("Column 'is_active' missing. Adding it...");
            db.run("ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1", (err) => {
                if (err) console.error("Update Error:", err);
                else console.log("SUCCESS: Added is_active column.");
            });
        } else {
            console.log("Column 'is_active' already exists.");
        }
    });
});
