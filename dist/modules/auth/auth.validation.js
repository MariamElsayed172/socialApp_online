"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetForgetPasswordCode = exports.verifyForgetPasswordCode = exports.sendForgetPasswordCode = exports.signupWithGmail = exports.confirmEmail = exports.signup = exports.login = void 0;
const zod_1 = require("zod");
const validation_middleware_1 = require("../../middleware/validation.middleware");
exports.login = {
    body: zod_1.z.strictObject({
        email: validation_middleware_1.generalFields.email,
        password: validation_middleware_1.generalFields.password,
    })
};
exports.signup = {
    body: exports.login.body.extend({
        fullName: validation_middleware_1.generalFields.fullName,
        confirmPassword: validation_middleware_1.generalFields.confirmPassword,
        phone: validation_middleware_1.generalFields.phone,
    }).superRefine((data, ctx) => {
        if (data.confirmPassword !== data.password) {
            ctx.addIssue({
                code: "custom",
                path: ["confirmPassword"],
                message: "Password misMatch confirmPassword"
            });
        }
    })
};
exports.confirmEmail = {
    body: zod_1.z.strictObject({
        email: validation_middleware_1.generalFields.email,
        otp: validation_middleware_1.generalFields.otp,
    })
};
exports.signupWithGmail = {
    body: zod_1.z.strictObject({
        idToken: zod_1.z.string,
    })
};
exports.sendForgetPasswordCode = {
    body: zod_1.z.strictObject({
        email: validation_middleware_1.generalFields.email,
    })
};
exports.verifyForgetPasswordCode = {
    body: exports.sendForgetPasswordCode.body.extend({
        otp: validation_middleware_1.generalFields.otp,
    })
};
exports.resetForgetPasswordCode = {
    body: exports.verifyForgetPasswordCode.body.extend({
        password: validation_middleware_1.generalFields.password,
        confirmPassword: validation_middleware_1.generalFields.confirmPassword,
    }).refine((data) => {
        return data.password === data.confirmPassword;
    }, { message: "password mismatch confirm-password", path: ['confirmPassword'] })
};
