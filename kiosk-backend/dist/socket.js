"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const logger_1 = require("./utils/logger");
let io = null;
const initSocket = (httpServer) => {
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: '*', // Allow all origins for now (adjust for production)
            methods: ['GET', 'POST'],
        },
    });
    io.on('connection', (socket) => {
        logger_1.logger.info(`[Socket] New client connected: ${socket.id}`);
        // Join a store-specific room
        socket.on('join_store', (storeId) => {
            if (storeId) {
                const roomName = `store_${storeId}`;
                socket.join(roomName);
                logger_1.logger.info(`[Socket] Client ${socket.id} joined room: ${roomName}`);
            }
        });
        socket.on('disconnect', () => {
            logger_1.logger.info(`[Socket] Client disconnected: ${socket.id}`);
        });
    });
    return io;
};
exports.initSocket = initSocket;
const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};
exports.getIO = getIO;
