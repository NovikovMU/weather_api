const http = require('http');
const app = require('./app');
const cors = require('cors');

app.use(cors());
const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

server.listen(PORT);