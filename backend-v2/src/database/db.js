const knex = require('knex');
const config = require('../../knexfile');

const environment = process.env.NODE_ENV || 'development';
const db = knex(config[environment]);

// Optional: Test connection
db.raw(environment === 'development' ? 'SELECT 1' : 'SELECT 1')
    .then(() => {
        console.log(`✅ Connected to database (${environment})`);
    })
    .catch((e) => {
        console.error(`❌ Database connection failed (${environment}):`, e);
    });

module.exports = db;
