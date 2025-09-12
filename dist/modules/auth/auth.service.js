"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const user_model_1 = require("../../DB/models/user.model");
const email_event_1 = require("../../utils/email/email.event");
const user_repository_1 = require("../../DB/repository/user.repository");
const otp_1 = require("../../utils/otp");
const error_response_1 = require("../../utils/response/error.response");
const hash_security_1 = require("../../utils/security/hash.security");
const token_security_1 = require("../../utils/security/token.security");
const google_auth_library_1 = require("google-auth-library");
const success_response_1 = require("../../utils/response/success.response");
class AuthenticationService {
    userModel = new user_repository_1.UserRepository(user_model_1.UserModel);
    constructor() { }
    async verifyGmailAccount(idToken) {
        const client = new google_auth_library_1.OAuth2Client();
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.WEB_CLIENT_ID?.split(",") || [],
        });
        const payload = ticket.getPayload();
        if (!payload?.email_verified) {
            throw new error_response_1.BadRequestException("Fail to verify this google account");
        }
        return payload;
    }
    signup = async (req, res) => {
        let { fullName, email, password, phone } = req.body;
        if (await this.userModel.findOne({ filter: { email }, options: { lean: true } })) {
            throw new error_response_1.ConflictException("Email exist");
        }
        await this.userModel.createUser({
            data: [{
                    fullName,
                    email,
                    password: await (0, hash_security_1.generateHash)(password),
                    phone,
                }]
        });
        await this.sendConfirmEmailOtp({ email });
        return (0, success_response_1.successResponse)({ res, statusCode: 201 });
    };
    signupWithGmail = async (req, res) => {
        const { idToken } = req.body;
        const { email, family_name, given_name, name, picture } = await this.verifyGmailAccount(idToken);
        const user = await this.userModel.findOne({
            filter: {
                email,
            },
        });
        if (user) {
            if (user.provider === user_model_1.ProviderEnum.Google) {
                return await this.loginWithGmail(req, res);
            }
            throw new error_response_1.ConflictException(`Email exist with another provider ::: ${user.provider}`);
        }
        const [newUser] = (await this.userModel.create({
            data: [{ email: email, firstName: given_name, lastName: family_name, profileImage: picture, confirmEmail: new Date(), provider: user_model_1.ProviderEnum.Google }]
        })) || [];
        if (!newUser) {
            throw new error_response_1.BadRequestException("Fail to signup with gmail please try again later");
        }
        const credentials = await (0, token_security_1.createLoginCredentials)(newUser);
        return (0, success_response_1.successResponse)({ res, statusCode: 201, data: { credentials } });
    };
    loginWithGmail = async (req, res) => {
        const { idToken } = req.body;
        const { email } = await this.verifyGmailAccount(idToken);
        const user = await this.userModel.findOne({
            filter: {
                email,
                provider: user_model_1.ProviderEnum.Google
            },
        });
        if (!user) {
            throw new error_response_1.NotFoundException(`Not register account or registered with another provider`);
        }
        const credentials = await (0, token_security_1.createLoginCredentials)(user);
        return (0, success_response_1.successResponse)({ res, data: { credentials } });
    };
    login = async (req, res) => {
        const { email, password } = req.body;
        const user = await this.userModel.findOne({ filter: { email, provider: user_model_1.ProviderEnum.System } });
        if (!user) {
            throw new error_response_1.NotFoundException("In-valid email or password");
        }
        if (!user.confirmEmail) {
            throw new error_response_1.BadRequestException("Please verify you account first");
        }
        if (!await (0, hash_security_1.compareHash)(password, user.password)) {
            throw new error_response_1.NotFoundException("In-valid email or password");
        }
        const credentials = await (0, token_security_1.createLoginCredentials)(user);
        return (0, success_response_1.successResponse)({ res, data: { credentials } });
    };
    confirmEmail = async (req, res) => {
        const { email, otp } = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email,
                confirmEmail: { $exists: false },
                confirmEmailOtp: { $exists: true }
            }
        });
        if (!user) {
            throw new error_response_1.NotFoundException("In-valid account or already verified");
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
        if (!await (0, hash_security_1.compareHash)(otp, user.confirmEmailOtp)) {
            const attempts = user.otpFailedAttempts + 1;
            const updateData = { otpFailedAttempts: attempts };
            if (attempts >= 5) {
                user.otpBannedUntil = new Date(now.getTime() + 5 * 60 * 1000);
                updateData.otpFailedAttempts = 0;
            }
            await this.userModel.updateOne({
                filter: { email },
                data: updateData
            });
            throw new error_response_1.ConflictException("Invalid OTP");
        }
        const updateUser = await this.userModel.updateOne({
            filter: { email },
            data: {
                confirmEmail: Date.now(),
                $unset: { confirmEmailOtp: true, otpFailedAttempts: true, confirmEmailOtpCreatedAt: true, otpBannedUntil: true },
                $inc: { __v: 1 }
            }
        });
        if (!updateUser.matchedCount) {
            throw new Error("fail to confirm user email");
        }
        return (0, success_response_1.successResponse)({ res });
    };
    sendConfirmEmailOtp = async ({ email }) => {
        const user = await this.userModel.findOne({
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
        const otp = (0, otp_1.generateNumberOtp)();
        await this.userModel.updateOne({
            filter: { email },
            data: {
                confirmEmailOtp: await (0, hash_security_1.generateHash)(String(otp)),
                confirmEmailOtpCreatedAt: now,
                otpFailedAttempts: 0,
                otpBannedUntil: null,
            },
        });
        email_event_1.emailEvent.emit("confirmEmail", { to: email, otp });
    };
    sendForgetCode = async (req, res) => {
        const { email } = req.body;
        const user = await this.userModel.findOne({ filter: { email, provider: user_model_1.ProviderEnum.System, confirmEmail: { $exists: true } } });
        if (!user) {
            throw new error_response_1.NotFoundException("In-valid account due to one of the following reasons [not register , invalid provider , not confirmed account ]");
        }
        const otp = (0, otp_1.generateNumberOtp)();
        const result = await this.userModel.updateOne({
            filter: { email },
            data: {
                resetPasswordOtp: await (0, hash_security_1.generateHash)(String(otp))
            }
        });
        if (!result.matchedCount) {
            throw new error_response_1.BadRequestException("Fail to send the reset code please try again later");
        }
        email_event_1.emailEvent.emit("resetPassword", { to: email, otp });
        return res.status(200).json({ message: "Done" });
    };
    verifyForgetCode = async (req, res) => {
        const { email, otp } = req.body;
        const user = await this.userModel.findOne({ filter: { email, provider: user_model_1.ProviderEnum.System, resetPasswordOtp: { $exists: true } } });
        if (!user) {
            throw new error_response_1.NotFoundException("In-valid account due to one of the following reasons [not register , invalid provider , not confirmed account , missing resetPasswordOtp ]");
        }
        if (!await (0, hash_security_1.compareHash)(otp, user.resetPasswordOtp)) {
            throw new error_response_1.ConflictException("In-valid otp ]");
        }
        return res.status(200).json({ message: "Done" });
    };
    resetForgetCode = async (req, res) => {
        const { email, otp, password } = req.body;
        const user = await this.userModel.findOne({ filter: { email, provider: user_model_1.ProviderEnum.System, resetPasswordOtp: { $exists: true } } });
        if (!user) {
            throw new error_response_1.NotFoundException("In-valid account due to one of the following reasons [not register , invalid provider , not confirmed account , missing resetPasswordOtp ]");
        }
        if (!await (0, hash_security_1.compareHash)(otp, user.resetPasswordOtp)) {
            throw new error_response_1.ConflictException("In-valid otp ]");
        }
        const result = await this.userModel.updateOne({
            filter: { email },
            data: {
                password: await (0, hash_security_1.generateHash)(password),
                changeCredentialsTime: new Date(),
                $unset: { resetPasswordOtp: 1 }
            }
        });
        if (!result.matchedCount) {
            throw new error_response_1.BadRequestException("Fail to reset password");
        }
        return res.status(200).json({ message: "Done" });
    };
}
exports.default = new AuthenticationService();
