import type { Request, Response } from "express";
import { customAlphabet } from "nanoid";
import * as DBService from '../../DB/db.service';
import { UserModel } from "../../DB/models/user.model";
import { emailEvent } from "../../utils/events/email.event";
import type { ISignupBodyInputsDTO } from "./auth.dto";



class AuthenticationService {
    constructor() { }

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
        // console.log({ fullName, email, password });
        if (await DBService.findOne({ model: UserModel, filter: { email } })) {
            throw new Error("Email exist", { cause: 409 })
        }
        const [user] = await DBService.create({
            model: UserModel,
            data: [
                {
                    fullName,
                    email,
                    password,
                    phone,
                }
            ]
        })

        await this.sendConfirmEmailOtp({ email })
        return res.status(201).json({ message: "Done", data: { user } })
    }

    login = async (req: Request, res: Response): Promise<Response> => {
        const { email, password } = req.body
        const user = await DBService.findOne({ model: UserModel, filter: { email } })
        if (!user) {
            throw new Error("In-valid email or password", { cause: 404 })
        }

        if (!user.confirmEmail) {
            throw new Error("Please verify you account first")
        }

        // if (user.deletedAt) {
        //     throw new Error("Account is deleted")
        // }

        if (password !== user.password) {
            throw new Error("In-valid email or password", { cause: 404 })
        }

        return res.status(200).json({ message: "Done", data: { user } })
    }


    confirmEmail = async (req: Request, res: Response): Promise<Response> => {
        const { email, otp } = req.body
        const user = await DBService.findOne({
            model: UserModel,
            filter: {
                email,
                confirmEmail: { $exists: false },
                confirmEmailOtp: { $exists: true }
            }
        })
        //console.log(user);

        if (!user) {
            throw new Error("In-valid account or already verified", { cause: 404 })
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


        if (otp !== user.confirmEmailOtp) {
            const attempts = user.otpFailedAttempts + 1;
            const updateData = { otpFailedAttempts: attempts };

            if (attempts >= 5) {
                user.otpBannedUntil = new Date(now.getTime() + 5 * 60 * 1000);
                updateData.otpFailedAttempts = 0;
            }

            await DBService.updateOne({
                model: UserModel,
                filter: { email },
                data: updateData
            });


            // if (updateUser.matchedCount) {
            //     throw new Error("fail to confirm user email")
            // }
            throw new Error("Invalid OTP", { cause: 401 });
            // return res.status(200).json({ message: "Done", data: { user } })
        }
        const updateUser = await DBService.updateOne({
            model: UserModel,
            filter: { email },
            data: {
                confirmEmail: Date.now(),
                $unset: { confirmEmailOtp: true, otpFailedAttempts: 0 },
                $inc: { __v: 1 }
            }
        })

        if (!updateUser.matchedCount) {
                throw new Error("fail to confirm user email")
            }
        return res.status(200).json({ message: "Done", data: { user } })

    }


    sendConfirmEmailOtp = async ({ email }: { email: string }) => {
        const user = await DBService.findOne({
            model: UserModel,
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

        const otp = customAlphabet("0123456789", 6)();

        await DBService.updateOne({
            model: UserModel,
            filter: { email },
            data: {
                confirmEmailOtp: otp,
                confirmEmailOtpCreatedAt: now,
                otpFailedAttempts: 0,
                otpBannedUntil: null,
            },
        });

        emailEvent.emit("confirmEmail", { to: email, otp });
    }
}

export default new AuthenticationService()