const https = require('https');
const fs = require('fs');
const { Server } = require('socket.io');
const express = require('express');
const path = require('path');

const app = express();

// Reading the certificate files
const options = {
    key: fs.readFileSync(path.join(__dirname, 'cert.key')),
    cert: fs.readFileSync(path.join(__dirname, 'cert.crt')),
    ca: fs.readFileSync(path.join(__dirname, 'ca.crt')),
};

// HTTPS server running on port 443
const httpsServer = https.createServer(options, app);

// Socket.IO setup with the HTTPS server
const io = new Server(httpsServer, {
    cors: {
        origin: "*",
    }
});

// Serve static files from the 'public' directory
app.use(express.static('public'));

app.set('view engine', 'ejs');

// Array with roomIds
let idArray = []; 

// Serve index.html
app.get("/", (req, res) => {
    console.log("Serving index.html");
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get("/:room", (req, res) => {
    const roomName = req.params.room;
    console.log(`Serving room: ${roomName}`);
    res.render("room", { roomName: roomName });
});

io.on('connection', (socket) => {
    console.log('A user connected with socket id:', socket.id);

    socket.on("receiveidArray", (id, roomName) => {
        const finderVariable = idArray.find(arrayObject => arrayObject.socketId === id);

        if (!finderVariable) {
            idArray.push({ roomName: roomName, socketId: id });
        }

        console.log(`Updated idArray: ${JSON.stringify(idArray)}`);
        io.to(roomName).emit("receiveidArray", idArray);
    });

    socket.on("socket-id", (id) => {
        console.log("The received socket-id is " + id);
    });

    socket.on('roomName', (roomName) => {
        console.log(`Received roomName: ${roomName}`);
        io.sockets.emit("roomName", roomName);
    });

    socket.on('joinRoom', (roomName) => {
        console.log(`User joined room: ${roomName}`);
        socket.join(roomName);
    });

    socket.on("msg", (id, roomName, msg) => {
        console.log(`Message received from ${id} in room ${roomName}: ${msg}`);
        io.to(roomName).emit("msg", id, msg);
    });

    socket.on('disconnect', () => {
        console.log(`User with socket id ${socket.id} disconnected`);
        idArray = idArray.filter(arrayObject => arrayObject.socketId !== socket.id);
        console.log('Updated idArray after disconnection:', idArray);
    });

    socket.on("offer", (offer, roomName) => {
        io.to(roomName).emit("offer", offer);
    });

    socket.on("answer", (answer, roomName) => {
        io.to(roomName).emit("answer", answer);
    });

    socket.on("ice-candidate", (candidate, roomName) => {
        io.to(roomName).emit("ice-candidate", candidate);
    });
});

// Start the server on port 443
httpsServer.listen(443, () => {
    console.log('HTTPS server is running on port 443');
});
