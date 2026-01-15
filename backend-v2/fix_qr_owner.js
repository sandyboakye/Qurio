const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data-v2/qr.db');

db.run("UPDATE qr_codes SET user_id = 7 WHERE id = 1", function (err) {
    if (err) {
        console.error("Error updating QR code:", err.message);
    } else {
        console.log(`Row(s) updated: ${this.changes}`);
    }
});
