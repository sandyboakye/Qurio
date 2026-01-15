const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data-v2/qr.db');

db.serialize(() => {
    console.log("--- Users ---");
    db.all("SELECT id, email FROM users", (err, rows) => {
        if (err) console.error(err);
        else console.table(rows);

        console.log("\n--- QR Codes ---");
        db.all("SELECT id, user_id, name, short_code FROM qr_codes", (err, rows) => {
            if (err) console.error(err);
            else console.table(rows);
        });
    });
});
