require('dotenv').config();
const app = require('./app');
const http = require('http');

const PORT = process.env.PORT || 3001;
const server = http.createServer(app);

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Backend V2 running on port ${PORT}`);
    console.log(`   Local:   http://localhost:${PORT}`);
    console.log(`   Network: http://0.0.0.0:${PORT}`); // Hint at LAN access
});
