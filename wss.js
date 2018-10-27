const express = require('express');
const app = express();
const http = require('http');
const WebSocket = require('ws');

const server = new http.createServer();
const wss = new WebSocket.Server({ server });

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    console.log('received: %s', message);
  });

  ws.send('connected');
});

app.use(express.static('./public'));
server.on('request', app);

module.exports = server;
