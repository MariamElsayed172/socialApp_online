import EventEmitter from "node:events";
import Mail from "nodemailer/lib/mailer";
import { sendEmail } from "./email.service";
import { verifyEmailTemplate } from "./templates/verify.email.template";

export const emailEvent = new EventEmitter()

interface IEmail extends Mail.Options {
    otp: number
}
emailEvent.on("confirmEmail", async (data: IEmail) => {
    await sendEmail({ to: data.to, subject: data.subject || "Confirm Email", html: verifyEmailTemplate({ otp: data.otp, }) })
        .catch(error => {
            console.log(`Fail to send email to ${data.to}`, error);

        })
})

emailEvent.on("resetPassword", async (data) => {
    await sendEmail({ to: data.to, subject: data.subject || "Reset password", html: verifyEmailTemplate({ otp: data.otp, title: "Reset code" }) })
        .catch(error => {
            console.log(`Fail to send email to ${data.to}`, error);

        })
})