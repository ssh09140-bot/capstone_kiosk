import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';

// Get backend URL from env
const getBaseUrl = () => {
    const url = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_URL;
    if (!url) {
        return 'http://10.0.2.2:3000';
    }
    // Remove /api if present, as socket connects to root
    return url.replace(/\/api$/, '');
};

const SOCKET_URL = getBaseUrl();

let socket: Socket | null = null;

export const initSocket = () => {
    if (!socket) {
        console.log('Initializing socket connection to:', SOCKET_URL);
        socket = io(SOCKET_URL, {
            transports: ['websocket'],
            autoConnect: true,
        });

        socket.on('connect', () => {
            console.log('Socket connected:', socket?.id);
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });

        socket.on('connect_error', (err) => {
            console.error('Socket connection error:', err);
        });
    }
    return socket;
};

export const getSocket = () => {
    if (!socket) {
        return initSocket();
    }
    return socket;
};
