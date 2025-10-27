"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateBoth = void 0;
const auth_1 = require("./auth");
const authenticateStore_1 = require("./authenticateStore");
const authenticateBoth = (req, res, next) => {
    // Try authenticateToken first
    (0, auth_1.authenticateToken)(req, res, (err) => {
        if (req.user) {
            // If authenticateToken succeeded, proceed
            return next();
        }
        // If authenticateToken failed or didn't set a user, try authenticateStore
        (0, authenticateStore_1.authenticateStore)(req, res, next);
    });
};
exports.authenticateBoth = authenticateBoth;
