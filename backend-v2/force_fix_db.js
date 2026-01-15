const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'data-v2/qr.db');
console.log('Opening DB at:', dbPath);
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Check columns and add if missing
    db.all("PRAGMA table_info(users)", (err, rows) => {
        if (err) { console.error(err); return; }
        console.log('Users Columns:', rows.map(r => r.name));

        const hasMaxQrs = rows.some(r => r.name === 'max_qrs');
        if (!hasMaxQrs) {
            console.log("Adding max_qrs...");
            db.run("ALTER TABLE users ADD COLUMN max_qrs INTEGER DEFAULT 10");
        } else console.log("max_qrs exists.");

        const hasEnterprise = rows.some(r => r.name === 'has_enterprise');
        if (!hasEnterprise) {
            console.log("Adding has_enterprise...");
            db.run("ALTER TABLE users ADD COLUMN has_enterprise INTEGER DEFAULT 0");
        } else console.log("has_enterprise exists.");

        const hasIsActive = rows.some(r => r.name === 'is_active');
        if (!hasIsActive) {
            console.log("Adding is_active...");
            db.run("ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1");
        } else console.log("is_active exists.");
    });
});
