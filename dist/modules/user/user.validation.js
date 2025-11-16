"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hardDelete = exports.restoreAccount = exports.freezeAccount = exports.changeRole = exports.acceptFriendRequest = exports.sendFriendRequest = exports.logout = void 0;
const zod_1 = require("zod");
const token_security_1 = require("../../utils/security/token.security");
const mongoose_1 = require("mongoose");
const validation_middleware_1 = require("../../middleware/validation.middleware");
const DB_1 = require("../../DB");
exports.logout = {
    body: zod_1.z.strictObject({
        flag: zod_1.z.enum(token_security_1.LogoutEnum).default(token_security_1.LogoutEnum.only)
    })
};
exports.sendFriendRequest = {
    params: zod_1.z.strictObject({
        userId: validation_middleware_1.generalFields.id,
    })
};
exports.acceptFriendRequest = {
    params: zod_1.z.strictObject({
        requestId: validation_middleware_1.generalFields.id,
    })
};
exports.changeRole = {
    params: exports.sendFriendRequest.params,
    body: zod_1.z.strictObject({
        role: zod_1.z.enum(DB_1.RoleEnum)
    })
};
exports.freezeAccount = {
    params: zod_1.z.object({
        userId: zod_1.z.string().optional(),
    }).optional().refine(data => {
        return data?.userId ? mongoose_1.Types.ObjectId.isValid(data.userId) : true;
    }, {
        error: "invalid objectId format",
        path: ["userId"],
    })
};
exports.restoreAccount = {
    params: zod_1.z.object({
        userId: zod_1.z.string(),
    }).refine(data => {
        return mongoose_1.Types.ObjectId.isValid(data.userId);
    }, {
        error: "invalid objectId format",
        path: ["userId"],
    })
};
exports.hardDelete = exports.restoreAccount;
