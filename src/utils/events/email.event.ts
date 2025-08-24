import EventEmitter from "node:events";
import { sendEmail } from "../email/email.service";
import { verifyEmailTemplate } from "../email/templates/verify.email.template";

export const emailEvent = new EventEmitter()


emailEvent.on("confirmEmail", async (data) => {
    await sendEmail({ to: data.to, subject: data.subject || "Confirm Email", html: verifyEmailTemplate({ otp: data.otp, }) }).catch(error => {
        console.log(`Fail to send email to ${data.to}`);

    })
})

emailEvent.on("sendForgotPassword", async (data) => {
    await sendEmail({ to: data.to, subject: data.subject || "Forgot Email", html: verifyEmailTemplate({ otp: data.otp, title: data.title }) }).catch(error => {
        console.log(`Fail to send email to ${data.to}`);

    })
})