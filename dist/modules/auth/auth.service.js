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
const nanoid_1 = require("nanoid");
const DBService = __importStar(require("../../DB/db.service"));
const user_model_1 = require("../../DB/models/user.model");
const email_event_1 = require("../../utils/events/email.event");
class AuthenticationService {
    constructor() { }
    signup = async (req, res) => {
        let { fullName, email, password, phone } = req.body;
        if (await DBService.findOne({ model: user_model_1.UserModel, filter: { email } })) {
            throw new Error("Email exist", { cause: 409 });
        }
        const [user] = await DBService.create({
            model: user_model_1.UserModel,
            data: [
                {
                    fullName,
                    email,
                    password,
                    phone,
                }
            ]
        });
        await this.sendConfirmEmailOtp({ email });
        return res.status(201).json({ message: "Done", data: { user } });
    };
    login = async (req, res) => {
        const { email, password } = req.body;
        const user = await DBService.findOne({ model: user_model_1.UserModel, filter: { email } });
        if (!user) {
            throw new Error("In-valid email or password", { cause: 404 });
        }
        if (!user.confirmEmail) {
            throw new Error("Please verify you account first");
        }
        if (password !== user.password) {
            throw new Error("In-valid email or password", { cause: 404 });
        }
        return res.status(200).json({ message: "Done", data: { user } });
    };
    confirmEmail = async (req, res) => {
        const { email, otp } = req.body;
        const user = await DBService.findOne({
            model: user_model_1.UserModel,
            filter: {
                email,
                confirmEmail: { $exists: false },
                confirmEmailOtp: { $exists: true }
            }
        });
        if (!user) {
            throw new Error("In-valid account or already verified", { cause: 404 });
        }
        const now = new Date();
        if (user.otpBannedUntil && user.otpBannedUntil > now) {
            throw new Error("You are temporarily banned from verifying. Try again later.", { cause: 429 });
        }
        if (user.confirmEmailOtpCreatedAt) {
            const otpAgeInMinutes = (now.getTime() - user.confirmEmailOtpCreatedAt.getTime()) / (1000 * 60);
            if (otpAgeInMinutes > 2) {
                throw new Error("OTP has expired", { cause: 410 });
            }
        }
        if (otp !== user.confirmEmailOtp) {
            const attempts = user.otpFailedAttempts + 1;
            const updateData = { otpFailedAttempts: attempts };
            if (attempts >= 5) {
                user.otpBannedUntil = new Date(now.getTime() + 5 * 60 * 1000);
                updateData.otpFailedAttempts = 0;
            }
            await DBService.updateOne({
                model: user_model_1.UserModel,
                filter: { email },
                data: updateData
            });
            throw new Error("Invalid OTP", { cause: 401 });
        }
        const updateUser = await DBService.updateOne({
            model: user_model_1.UserModel,
            filter: { email },
            data: {
                confirmEmail: Date.now(),
                $unset: { confirmEmailOtp: true, otpFailedAttempts: 0 },
                $inc: { __v: 1 }
            }
        });
        if (!updateUser.matchedCount) {
            throw new Error("fail to confirm user email");
        }
        return res.status(200).json({ message: "Done", data: { user } });
    };
    sendConfirmEmailOtp = async ({ email }) => {
        const user = await DBService.findOne({
            model: user_model_1.UserModel,
            filter: {
                email,
                confirmEmail: { $exists: false },
            },
        });
        if (!user) {
            throw new Error("User not found or already verified", { cause: 404 });
        }
        const now = new Date();
        if (user.otpBannedUntil && user.otpBannedUntil > now) {
            throw new Error("You are temporarily banned from requesting a new code. Try again later.", { cause: 429 });
        }
        if (user.confirmEmailOtpCreatedAt) {
            const otpAgeInMinutes = (now.getTime() - user.confirmEmailOtpCreatedAt.getTime()) / (1000 * 60);
            if (otpAgeInMinutes < 2) {
                throw new Error("OTP is not expired, so please wait", { cause: 410 });
            }
        }
        const otp = (0, nanoid_1.customAlphabet)("0123456789", 6)();
        await DBService.updateOne({
            model: user_model_1.UserModel,
            filter: { email },
            data: {
                confirmEmailOtp: otp,
                confirmEmailOtpCreatedAt: now,
                otpFailedAttempts: 0,
                otpBannedUntil: null,
            },
        });
        email_event_1.emailEvent.emit("confirmEmail", { to: email, otp });
    };
}
exports.default = new AuthenticationService();
