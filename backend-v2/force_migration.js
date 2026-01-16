const db = require('./src/database/db');

async function run() {
    try {
        await db.schema.table('users', table => {
            table.string('name');
        });
        console.log("Column 'name' added successfully or already exists.");
    } catch (e) {
        console.log("Error adding column (probably exists):", e.message);
    }
    process.exit();
}

run();
