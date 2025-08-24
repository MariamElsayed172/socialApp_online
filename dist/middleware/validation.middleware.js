"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generalFields = exports.validation = void 0;
const error_response_1 = require("../utils/response/error.response");
const zod_1 = require("zod");
const validation = (schema) => {
    return (req, res, next) => {
        const validationErrors = [];
        for (const key of Object.keys(schema)) {
            if (!schema[key])
                continue;
            const validationResult = schema[key].safeParse(req[key]);
            if (!validationResult.success) {
                const errors = validationResult.error;
                validationErrors.push({
                    key, issues: errors.issues.map((issue) => {
                        return { message: issue.message, path: issue.path[0] };
                    })
                });
            }
        }
        if (validationErrors.length) {
            throw new error_response_1.BadRequestException("validation Error", {
                validationErrors
            });
        }
        return next();
    };
};
exports.validation = validation;
exports.generalFields = {
    fullName: zod_1.z.string({ error: "fullName is required" }).min(2).max(20),
    email: zod_1.z.email(),
    phone: zod_1.z.string().regex(/^(002|\+2)?01[0125][0-9]{8}$/),
    password: zod_1.z.string().regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/),
    confirmPassword: zod_1.z.string(),
    otp: zod_1.z.string().regex(/^\d{6}$/)
};
