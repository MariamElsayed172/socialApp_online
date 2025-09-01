"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = exports.ProviderEnum = exports.RoleEnum = exports.GenderEnum = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var GenderEnum;
(function (GenderEnum) {
    GenderEnum["Male"] = "male";
    GenderEnum["Female"] = "female";
})(GenderEnum || (exports.GenderEnum = GenderEnum = {}));
var RoleEnum;
(function (RoleEnum) {
    RoleEnum["User"] = "user";
    RoleEnum["Admin"] = "admin";
})(RoleEnum || (exports.RoleEnum = RoleEnum = {}));
var ProviderEnum;
(function (ProviderEnum) {
    ProviderEnum["System"] = "system";
    ProviderEnum["Google"] = "google";
})(ProviderEnum || (exports.ProviderEnum = ProviderEnum = {}));
const userSchema = new mongoose_1.Schema({
    firstName: { type: String, required: true, minlength: 2, maxlength: 20 },
    lastName: { type: String, required: true, minlength: 2, maxlength: 20 },
    email: { type: String, required: true, unique: true },
    password: {
        type: String,
        required: function () {
            return this.provider === ProviderEnum.Google ? false : true;
        },
    },
    phone: {
        type: String,
        required: function () {
            return this.provider === ProviderEnum.System;
        },
    },
    resetPasswordOtp: { type: String },
    changeCredentialsTime: { type: Date },
    gender: {
        type: String,
        enum: GenderEnum,
        default: GenderEnum.Male,
    },
    role: {
        type: String,
        enum: RoleEnum,
        default: RoleEnum.User,
    },
    provider: {
        type: String,
        enum: ProviderEnum,
        default: ProviderEnum.System,
    },
    confirmEmail: Date,
    confirmEmailOtp: String,
    confirmEmailOtpCreatedAt: Date,
    otpFailedAttempts: { type: Number, default: 0 },
    otpBannedUntil: Date,
    profileImage: { type: String },
    coverImages: [String],
}, {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
});
userSchema
    .virtual("fullName")
    .get(function () {
    return `${this.firstName} ${this.lastName}`;
})
    .set(function (value) {
    const [firstName, lastName] = value?.split(" ") || [];
    this.set({ firstName, lastName });
});
exports.UserModel = mongoose_1.default.models.User || mongoose_1.default.model("User", userSchema);
