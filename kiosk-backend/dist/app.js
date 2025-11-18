"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
console.log('app.ts file is being loaded');
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const auth_1 = __importDefault(require("./auth"));
const analytics_1 = __importDefault(require("./analytics"));
const products_1 = __importDefault(require("./products"));
const categories_1 = __importDefault(require("./categories"));
const option_groups_1 = __importDefault(require("./option-groups"));
const orders_1 = __importDefault(require("./orders"));
const users_1 = __importDefault(require("./users"));
const payments_1 = __importDefault(require("./payments"));
const notifications_1 = __importDefault(require("./notifications"));
const purchase_orders_1 = __importDefault(require("./purchase-orders"));
const inventory_1 = __importDefault(require("./inventory"));
const suppliers_1 = __importDefault(require("./suppliers"));
const inventory_logs_1 = __importDefault(require("./inventory-logs")); // Import the new inventory log router
const recommendations_1 = __importDefault(require("./recommendations"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((req, res, next) => {
    res.setHeader('Permissions-Policy', 'local-network-access=*');
    next();
});
const uploadsDir = path_1.default.join(__dirname, '../uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir);
}
app.use('/uploads', express_1.default.static(uploadsDir));
app.use('/api/auth', auth_1.default);
app.use('/api', analytics_1.default);
app.use('/api/products', products_1.default);
app.use('/api/categories', categories_1.default);
app.use('/api/option-groups', option_groups_1.default);
app.use('/api/orders', orders_1.default);
app.use('/api', payments_1.default);
app.use('/api', users_1.default);
app.use('/api/notifications', notifications_1.default);
app.use('/api/purchase-orders', purchase_orders_1.default);
app.use('/api/inventory', inventory_1.default);
app.use('/api/suppliers', suppliers_1.default);
app.use('/api/inventory-logs', inventory_logs_1.default); // Use the new inventory log router
app.use('/api/recommendations', recommendations_1.default);
exports.default = app;
