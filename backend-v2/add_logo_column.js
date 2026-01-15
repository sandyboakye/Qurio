const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'data-v2/qr.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to database at:', dbPath);
    }
});

db.serialize(() => {
    db.run("ALTER TABLE qr_codes ADD COLUMN logo_image TEXT", (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('Column logo_image already exists.');
            } else {
                console.error('Error adding column:', err);
            }
        } else {
            console.log('Successfully added logo_image column.');
        }
    });
});

db.close();
