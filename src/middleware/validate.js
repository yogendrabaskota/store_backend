"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const zod_1 = require("zod");
const validate = (schema) => (req, res, next) => {
    try {
        req.body = schema.parse(req.body); // cleans and validates
        next();
    }
    catch (err) {
        if (err instanceof zod_1.ZodError) {
            const formattedErrors = err.issues.map((e) => ({
                field: e.path.join("."),
                message: e.message,
            }));
            return res.status(400).json({
                message: "Validation Error",
                errors: formattedErrors,
            });
        }
        return res.status(500).json({
            message: "Server Error",
            error: err instanceof Error ? err.message : "Unknown error",
        });
    }
};
exports.validate = validate;
//# sourceMappingURL=validate.js.map