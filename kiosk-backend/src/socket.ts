import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { logger } from './utils/logger';

let io: SocketIOServer | null = null;

export const initSocket = (httpServer: HttpServer) => {
    io = new SocketIOServer(httpServer, {
        cors: {
            origin: '*', // Allow all origins for now (adjust for production)
            methods: ['GET', 'POST'],
        },
    });

    io.on('connection', (socket) => {
        logger.info(`[Socket] New client connected: ${socket.id}`);

        // Join a store-specific room
        socket.on('join_store', (storeId: string) => {
            if (storeId) {
                const roomName = `store_${storeId}`;
                socket.join(roomName);
                logger.info(`[Socket] Client ${socket.id} joined room: ${roomName}`);
            }
        });

        socket.on('disconnect', () => {
            logger.info(`[Socket] Client disconnected: ${socket.id}`);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};
