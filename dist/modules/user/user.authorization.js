"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.endpoint = void 0;
const user_model_1 = require("../../DB/models/user.model");
exports.endpoint = {
    profile: [user_model_1.RoleEnum.User, user_model_1.RoleEnum.Admin],
    restoreAccount: [user_model_1.RoleEnum.Admin],
    hardDelete: [user_model_1.RoleEnum.Admin],
    dashboard: [user_model_1.RoleEnum.Admin, user_model_1.RoleEnum.SuperAdmin],
    changeRole: [user_model_1.RoleEnum.Admin, user_model_1.RoleEnum.SuperAdmin]
};
