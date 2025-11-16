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
const hash_security_1 = require("../../utils/security/hash.security");
const email_event_1 = require("../../utils/email/email.event");
var GenderEnum;
(function (GenderEnum) {
    GenderEnum["Male"] = "male";
    GenderEnum["Female"] = "female";
})(GenderEnum || (exports.GenderEnum = GenderEnum = {}));
var RoleEnum;
(function (RoleEnum) {
    RoleEnum["User"] = "user";
    RoleEnum["Admin"] = "admin";
    RoleEnum["SuperAdmin"] = "super-admin";
})(RoleEnum || (exports.RoleEnum = RoleEnum = {}));
var ProviderEnum;
(function (ProviderEnum) {
    ProviderEnum["System"] = "system";
    ProviderEnum["Google"] = "google";
})(ProviderEnum || (exports.ProviderEnum = ProviderEnum = {}));
const userSchema = new mongoose_1.Schema({
    firstName: { type: String, required: true, minlength: 2, maxlength: 25 },
    lastName: { type: String, required: true, minlength: 2, maxlength: 25 },
    slug: { type: String, required: true, minlength: 5, maxlength: 51 },
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
    freezedAt: Date,
    freezedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    restoredAt: Date,
    restoredBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    friends: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User" }],
    profileImage: { type: String },
    temProfileImage: { type: String },
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
    this.set({ firstName, lastName, slug: value.replaceAll(/\s+/g, "-") });
});
userSchema.pre("save", async function (next) {
    this.wasNew = this.isNew;
    if (this.isModified("password")) {
        this.password = await (0, hash_security_1.generateHash)(this.password);
    }
    if (this.isModified("confirmEmailOtp")) {
        this.confirmEmailPlainOtp = this.confirmEmailOtp;
        this.confirmEmailOtp = await (0, hash_security_1.generateHash)(this.confirmEmailOtp);
    }
    next();
});
userSchema.post("save", async function (doc, next) {
    const that = this;
    if (that.wasNew && that.confirmEmailPlainOtp) {
        email_event_1.emailEvent.emit("confirmEmail", {
            to: this.email,
            otp: that.confirmEmailPlainOtp
        });
    }
    next();
});
userSchema.pre(["find", "findOne"], function (next) {
    const query = this.getQuery();
    if (query.paranoid == false) {
        this.setQuery({ ...query });
    }
    else {
        this.setQuery({ ...query, freezedAt: { $exists: false } });
    }
    next();
});
exports.UserModel = mongoose_1.default.models.User || mongoose_1.default.model("User", userSchema);
