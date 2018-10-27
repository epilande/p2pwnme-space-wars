const express = require('express');
const app = express();
const http = require('http');
const WebSocket = require('ws');
const { clientConnected } = require('./client-handler');

const server = new http.createServer();
const wss = new WebSocket.Server({ server });

app.use(express.static('./dist'));

wss.on('connection', clientConnected)

server.on('request', app);

module.exports = server;
