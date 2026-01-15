const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Fix path to point to data-v2/qr.db relative to where we run this script (backend-v2)
// data-v2 is a sibling of backend-v2
const dbPath = path.resolve(__dirname, 'data-v2/qr.db');

console.log('Opening DB at:', dbPath);
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // 1. Promote Sandy
    db.run("UPDATE users SET role='admin' WHERE email LIKE 'sandy%'", function (err) {
        if (err) console.error(err);
        console.log(`Promoted Sandy: ${this.changes} rows updated.`);
    });

    // 2. Demote others (optional, but ensures safety)
    db.run("UPDATE users SET role='user' WHERE email NOT LIKE 'sandy%'", function (err) {
        if (err) console.error(err);
        console.log(`Demoted others: ${this.changes} rows updated.`);
    });

    // 3. Verify
    db.all("SELECT id, email, role FROM users", (err, rows) => {
        console.log('Current Users:', rows);
    });
});
