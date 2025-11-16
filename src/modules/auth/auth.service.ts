import type { Request, Response } from "express";
import { ProviderEnum, UserModel } from "../../DB/models/user.model";
import { emailEvent } from "../../utils/email/email.event";
import type { IConfirmEmailBodyInputsDTO, IForgotCodeBodyInputsDTO, IGmail, ILoginBodyInputsDTO, IResetCodeBodyInputsDTO, ISignupBodyInputsDTO, IVerifyCodeBodyInputsDTO } from "./auth.dto";

import { generateNumberOtp } from "../../utils/otp";
import { BadRequestException, ConflictException, NotFoundException } from "../../utils/response/error.response";
import { compareHash, generateHash } from "../../utils/security/hash.security";
import { createLoginCredentials } from "../../utils/security/token.security";

import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import { successResponse } from "../../utils/response/success.response";
import { ILoginResponse } from "./auth.entities";
import { UserRepository } from "../../DB/repository";


class AuthenticationService {
    private userModel = new UserRepository(UserModel);
    constructor() { }

    private async verifyGmailAccount(idToken: string): Promise<TokenPayload> {
        const client = new OAuth2Client();
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.WEB_CLIENT_ID?.split(",") || [],
        });
        const payload = ticket.getPayload();
        if (!payload?.email_verified) {
            throw new BadRequestException("Fail to verify this google account")
        }
        return payload;

    }


    /**
     * 
     * @param req - Express.Request
     * @param res - Express.Response
     * @returns Promise<Response>
     * @example({username, email, password})
     * return {message:"Done", statusCode:201}
     * 
     */

    signup = async (req: Request, res: Response): Promise<Response> => {

        let { fullName, email, password, phone }: ISignupBodyInputsDTO = req.body;

        if (await this.userModel.findOne({ filter: { email }, options: { lean: true } })) {
            throw new ConflictException("Email exist")
        }
        const otp = generateNumberOtp();
        await this.userModel.createUser({
            data: [{
                fullName,
                email,
                password,
                confirmEmailOtp: String(otp),
                phone,
            }]
        });


        //await this.sendConfirmEmailOtp({ email, otp })
        return successResponse({ res, statusCode: 201 })
    }

    signupWithGmail = async (req: Request, res: Response): Promise<Response> => {
        const { idToken }: IGmail = req.body;
        const { email, family_name, given_name, name, picture } = await this.verifyGmailAccount(idToken as string);
        const user = await this.userModel.findOne({
            filter: {
                email,
            },
        });

        if (user) {
            if (user.provider === ProviderEnum.Google) {
                return await this.loginWithGmail(req, res)
            }
            throw new ConflictException(`Email exist with another provider ::: ${user.provider}`)
        }

        const [newUser] = (await this.userModel.create({
            data: [{ email: email as string, firstName: given_name as string, lastName: family_name as string, profileImage: picture as string, confirmEmail: new Date(), provider: ProviderEnum.Google }]
        })) || []
        if (!newUser) {
            throw new BadRequestException("Fail to signup with gmail please try again later")
        }
        const credentials = await createLoginCredentials(newUser);


        return successResponse<ILoginResponse>({ res, statusCode: 201, data: { credentials } })
    }

    loginWithGmail = async (req: Request, res: Response): Promise<Response> => {
        const { idToken }: IGmail = req.body;
        const { email } = await this.verifyGmailAccount(idToken as string);
        const user = await this.userModel.findOne({
            filter: {
                email,
                provider: ProviderEnum.Google
            },
        });

        if (!user) {
            throw new NotFoundException(`Not register account or registered with another provider`)
        }

        const credentials = await createLoginCredentials(user);

        return successResponse<ILoginResponse>({ res, data: { credentials } })
    }

    login = async (req: Request, res: Response): Promise<Response> => {
        const { email, password }: ILoginBodyInputsDTO = req.body
        const user = await this.userModel.findOne({ filter: { email, provider: ProviderEnum.System } })
        if (!user) {
            throw new NotFoundException("In-valid email or password")
        }

        if (!user.confirmEmail) {
            throw new BadRequestException("Please verify you account first")
        }

        if (! await compareHash(password, user.password as string)) {
            throw new NotFoundException("In-valid email or password")
        }

        const credentials = await createLoginCredentials(user);
        return successResponse<ILoginResponse>({ res, data: { credentials } })
    }


    confirmEmail = async (req: Request, res: Response): Promise<Response> => {
        const { email, otp }: IConfirmEmailBodyInputsDTO = req.body
        const user = await this.userModel.findOne({
            filter: {
                email,
                confirmEmail: { $exists: false },
                confirmEmailOtp: { $exists: true }
            }
        })
        //console.log(user);

        if (!user) {
            throw new NotFoundException("In-valid account or already verified")
        }

        const now = new Date();

        if (user.otpBannedUntil && user.otpBannedUntil > now) {
            throw new Error("You are temporarily banned from verifying. Try again later.", { cause: 429 });
        }

        if (user.confirmEmailOtpCreatedAt) {
            const otpAgeInMinutes =
                (now.getTime() - user.confirmEmailOtpCreatedAt.getTime()) / (1000 * 60);
            if (otpAgeInMinutes > 2) {
                throw new Error("OTP has expired", { cause: 410 });
            }
        }


        if (! await compareHash(otp, user.confirmEmailOtp as string)) {
            const attempts = user.otpFailedAttempts as number + 1;
            const updateData = { otpFailedAttempts: attempts };

            if (attempts >= 5) {
                user.otpBannedUntil = new Date(now.getTime() + 5 * 60 * 1000);
                updateData.otpFailedAttempts = 0;
            }

            await this.userModel.updateOne({
                filter: { email },
                data: updateData
            });



            throw new ConflictException("Invalid OTP");
        }
        const updateUser = await this.userModel.updateOne({
            filter: { email },
            data: {
                confirmEmail: Date.now(),
                $unset: { confirmEmailOtp: true, otpFailedAttempts: true, confirmEmailOtpCreatedAt: true, otpBannedUntil: true },
                $inc: { __v: 1 }
            }
        })

        if (!updateUser.matchedCount) {
            throw new Error("fail to confirm user email")
        }
        return successResponse({ res })

    }


    sendConfirmEmailOtp = async ({ email, otp }: { email: string , otp: number}) => {
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
            throw new Error(
                "You are temporarily banned from requesting a new code. Try again later.",
                { cause: 429 }
            );
        }

        if (user.confirmEmailOtpCreatedAt) {
            const otpAgeInMinutes =
                (now.getTime() - user.confirmEmailOtpCreatedAt.getTime()) / (1000 * 60);
            if (otpAgeInMinutes < 2) {
                throw new Error("OTP is not expired, so please wait", { cause: 410 });
            }
        }


        await this.userModel.updateOne({
            filter: { email },
            data: {
                confirmEmailOtpCreatedAt: new Date(),
                otpFailedAttempts: 0,
                otpBannedUntil: null,
            },
        });

        emailEvent.emit("confirmEmail", { to: email, otp });
    }

    sendForgetCode = async (req: Request, res: Response): Promise<Response> => {
        const { email }: IForgotCodeBodyInputsDTO = req.body
        const user = await this.userModel.findOne({ filter: { email, provider: ProviderEnum.System, confirmEmail: { $exists: true } } })
        if (!user) {
            throw new NotFoundException("In-valid account due to one of the following reasons [not register , invalid provider , not confirmed account ]")
        }
        const otp = generateNumberOtp()
        const result = await this.userModel.updateOne({
            filter: { email },
            data: {
                resetPasswordOtp: await generateHash(String(otp))
            }
        })
        if (!result.matchedCount) {
            throw new BadRequestException("Fail to send the reset code please try again later")
        }
        emailEvent.emit("resetPassword", { to: email, otp })
        return res.status(200).json({ message: "Done" })
    }


    verifyForgetCode = async (req: Request, res: Response): Promise<Response> => {
        const { email, otp }: IVerifyCodeBodyInputsDTO = req.body
        const user = await this.userModel.findOne({ filter: { email, provider: ProviderEnum.System, resetPasswordOtp: { $exists: true } } })
        if (!user) {
            throw new NotFoundException("In-valid account due to one of the following reasons [not register , invalid provider , not confirmed account , missing resetPasswordOtp ]")
        }

        if (!await compareHash(otp, user.resetPasswordOtp as string)) {
            throw new ConflictException("In-valid otp ]")
        }

        return res.status(200).json({ message: "Done" })
    }

    resetForgetCode = async (req: Request, res: Response): Promise<Response> => {
        const { email, otp, password }: IResetCodeBodyInputsDTO = req.body
        const user = await this.userModel.findOne({ filter: { email, provider: ProviderEnum.System, resetPasswordOtp: { $exists: true } } })
        if (!user) {
            throw new NotFoundException("In-valid account due to one of the following reasons [not register , invalid provider , not confirmed account , missing resetPasswordOtp ]")
        }

        if (!await compareHash(otp, user.resetPasswordOtp as string)) {
            throw new ConflictException("In-valid otp ]")
        }
        const result = await this.userModel.updateOne({
            filter: { email },
            data: {
                password: await generateHash(password),
                changeCredentialsTime: new Date(),
                $unset: { resetPasswordOtp: 1 }
            }
        })
        if (!result.matchedCount) {
            throw new BadRequestException("Fail to reset password")
        }


        return res.status(200).json({ message: "Done" })
    }
}

export default new AuthenticationService()