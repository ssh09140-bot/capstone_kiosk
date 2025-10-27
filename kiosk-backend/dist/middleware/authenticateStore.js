"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateStore = void 0;
const authenticateStore = (req, res, next) => {
    const storeId = req.headers['x-store-id'];
    if (!storeId) {
        return res.status(401).json({ message: 'Store ID가 제공되지 않았습니다.' });
    }
    // For now, we just set the storeId. In a real app, you might validate this storeId against your database.
    req.users = { storeId: storeId };
    next();
};
exports.authenticateStore = authenticateStore;
