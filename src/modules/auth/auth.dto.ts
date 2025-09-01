
import * as validators from './auth.validation'
import {z} from 'zod'

export type ISignupBodyInputsDTO = z.infer<typeof validators.signup.body>
export type ILoginBodyInputsDTO = z.infer<typeof validators.login.body>
export type IForgotCodeBodyInputsDTO = z.infer<typeof validators.sendForgetPasswordCode.body>
export type IVerifyCodeBodyInputsDTO = z.infer<typeof validators.verifyForgetPasswordCode.body>
export type IConfirmEmailBodyInputsDTO = z.infer<typeof validators.confirmEmail.body>
export type IResetCodeBodyInputsDTO = z.infer<typeof validators.resetForgetPasswordCode.body>
export type IGmail = z.infer<typeof validators.signupWithGmail.body>
