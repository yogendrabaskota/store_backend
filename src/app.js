"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const hpp_1 = __importDefault(require("hpp"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const user_route_1 = __importDefault(require("./modules/user/route/user.route"));
const category_route_1 = __importDefault(require("./modules/category/route/category.route"));
const product_route_1 = __importDefault(require("./modules/product/route/product.route"));
const inventory_route_1 = __importDefault(require("./modules/inventory/route/inventory.route"));
const sale_route_1 = __importDefault(require("./modules/sale/route/sale.route"));
const auditLog_route_1 = __importDefault(require("./modules/auditLog/route/auditLog.route"));
const dashboard_route_1 = __importDefault(require("./modules/dashboard/route/dashboard.route"));
const report_route_1 = __importDefault(require("./modules/report/route/report.route"));
const system_route_1 = __importDefault(require("./modules/settings/route/system.route"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
// ---------------------------
// Middlewares
// ---------------------------
// Security HTTP headers
app.use((0, helmet_1.default)());
// Prevent HTTP parameter pollution
app.use((0, hpp_1.default)());
// Enable CORS (adjust origin in production)
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
}));
// Logging
app.use((0, morgan_1.default)("combined"));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per window
    message: "Too many requests from this IP, please try again later",
});
app.use(limiter);
// Body parsers
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// ---------------------------
// Routes
// ---------------------------
app.use("/api/users", user_route_1.default);
app.use("/api", category_route_1.default);
app.use("/api", product_route_1.default);
app.use("/api", inventory_route_1.default);
app.use("/api", sale_route_1.default);
app.use("/api", auditLog_route_1.default);
app.use("/api", dashboard_route_1.default);
app.use("/api", report_route_1.default);
app.use("/api", system_route_1.default);
// ---------------------------
// Default error handler
// ---------------------------
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Something went wrong" });
});
exports.default = app;
//# sourceMappingURL=app.js.map