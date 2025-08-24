"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const sendEmail = async ({ from = process.env.EMAIL_USER, to = "", cc = "", bcc = "", text = "", subject = "Saraha App", html = "", attachments = [] }) => {
    const transporter = nodemailer_1.default.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
    return await transporter.sendMail({
        from: `"Social App" <${from}>`,
        to,
        cc,
        bcc,
        text,
        subject,
        html,
        attachments,
    });
};
exports.sendEmail = sendEmail;
