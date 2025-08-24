import nodemailer from 'nodemailer'

export const sendEmail = async ({ from = process.env.EMAIL_USER, to = "", cc = "", bcc = "", text = "", subject = "Saraha App", html = "", attachments = [] }) => {
    const transporter = nodemailer.createTransport({
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