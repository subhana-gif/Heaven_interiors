// socket.js or a similar file where you initialize Socket.IO
const { Server } = require("socket.io");

let io; // Declare the io variable

function init(server) {
    io = new Server(server); // Initialize Socket.IO with the server
}

function getIo() {
    if (!io) {
        throw new Error("Socket.io not initialized!"); // Throw an error if io is not initialized
    }
    return io; // Return the io instance
}

module.exports = { init, getIo }; // Export the init and getIo functions
