"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailEvent = void 0;
const node_events_1 = __importDefault(require("node:events"));
const email_service_1 = require("./email.service");
const verify_email_template_1 = require("./templates/verify.email.template");
exports.emailEvent = new node_events_1.default();
exports.emailEvent.on("confirmEmail", async (data) => {
    await (0, email_service_1.sendEmail)({ to: data.to, subject: data.subject || "Confirm Email", html: (0, verify_email_template_1.verifyEmailTemplate)({ otp: data.otp, }) })
        .catch(error => {
        console.log(`Fail to send email to ${data.to}`, error);
    });
});
exports.emailEvent.on("resetPassword", async (data) => {
    await (0, email_service_1.sendEmail)({ to: data.to, subject: data.subject || "Reset password", html: (0, verify_email_template_1.verifyEmailTemplate)({ otp: data.otp, title: "Reset code" }) })
        .catch(error => {
        console.log(`Fail to send email to ${data.to}`, error);
    });
});
