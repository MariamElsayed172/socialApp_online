import { z } from 'zod'
import { generalFields } from '../../middleware/validation.middleware'

export const login = {
    body: z.strictObject({
        email: generalFields.email,
        password: generalFields.password,
    })
}

export const signup = {
    body: login.body.extend({
        fullName: generalFields.fullName,
        confirmPassword: generalFields.confirmPassword,
        phone: generalFields.phone,
    }).superRefine((data, ctx) => {
        if (data.confirmPassword !== data.password) {
            ctx.addIssue({
                code: "custom",
                path: ["confirmPassword"],
                message: "Password misMatch confirmPassword"
            })
        }
    })
}

export const confirmEmail = {
    body: z.strictObject({
        email: generalFields.email,
        otp: generalFields.otp,
    })
}