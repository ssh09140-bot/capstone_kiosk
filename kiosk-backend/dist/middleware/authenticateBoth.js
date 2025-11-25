"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateBoth = void 0;
const authenticateStore_1 = require("./authenticateStore");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticateBoth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
        try {
            jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET, (err, user) => {
                if (err) {
                    // Token is invalid or expired. Fallback to authenticateStore.
                    return (0, authenticateStore_1.authenticateStore)(req, res, next);
                }
                req.user = user;
                next();
            });
        }
        catch (error) {
            // In case verify throws synchronously
            (0, authenticateStore_1.authenticateStore)(req, res, next);
        }
    }
    else {
        // No token provided. Fallback to authenticateStore.
        (0, authenticateStore_1.authenticateStore)(req, res, next);
    }
};
exports.authenticateBoth = authenticateBoth;
