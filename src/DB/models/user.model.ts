
import mongoose, { Schema, Document, Model } from "mongoose";

export enum GenderEnum {
    Male = "male",
    Female = "female",
}

export enum RoleEnum {
    User = "user",
    Admin = "admin",
}

export enum ProviderEnum {
    System = "system",
    Google = "google",
}

export interface IUser extends Document {
    firstName: string;
    lastName: string;
    email: string;
    password?: string;
    phone?: string;
    gender: GenderEnum;
    role: RoleEnum;
    provider: ProviderEnum;
    confirmEmail?: Date;
    confirmEmailOtp?: string;
    confirmEmailOtpCreatedAt?: Date;
    // forgotPasswordOtp?: string;
    // changeCredentialsTime?: Date;
    otpFailedAttempts: number;
    otpBannedUntil?: Date;
    // deletedAt?: Date;
    // deletedBy?: mongoose.Types.ObjectId;
    // restoreAt?: Date;
    // restoreBy?: mongoose.Types.ObjectId;
    // picture?: { secure_url: string; public_id: string };
    // coverImages?: { secure_url: string; public_id: string }[];
    fullName: string;
}


const userSchema = new Schema<IUser>(
    {
        firstName: { type: String, required: true, minlength: 2, maxlength: 20 },
        lastName: { type: String, required: true, minlength: 2, maxlength: 20 },
        email: { type: String, required: true, unique: true },
        password: {
            type: String,
            required: function (this: IUser) {
                return this.provider === ProviderEnum.System;
            },
        },
        phone: {
            type: String,
            required: function (this: IUser) {
                return this.provider === ProviderEnum.System;
            },
        },
        // forgotPasswordOtp: String,
        // changeCredentialsTime: Date,
        gender: {
            type: String,
            enum: Object.values(GenderEnum),
            default: GenderEnum.Male,
        },
        role: {
            type: String,
            enum: Object.values(RoleEnum),
            default: RoleEnum.User,
        },
        provider: {
            type: String,
            enum: Object.values(ProviderEnum),
            default: ProviderEnum.System,
        },
        confirmEmail: Date,
        confirmEmailOtp: String,
        confirmEmailOtpCreatedAt: Date,
        otpFailedAttempts: { type: Number, default: 0 },
        otpBannedUntil: Date,
        // deletedAt: Date,
        // deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        // restoreAt: Date,
        // restoreBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        // picture: {
        //     secure_url: String,
        //     public_id: String,
        // },
        // coverImages: [
        //     {
        //         secure_url: String,
        //         public_id: String,
        //     },
        // ],
    },
    {
        timestamps: true,
        toObject: { virtuals: true },
        toJSON: { virtuals: true },
    }
);

userSchema
    .virtual("fullName")
    .get(function (this: IUser) {
        return `${this.firstName} ${this.lastName}`;
    })
    .set(function (this: IUser, value: string) {
        const [firstName, lastName] = value?.split(" ") || [];
        this.set({ firstName, lastName });
    });



export const UserModel: Model<IUser> =
    mongoose.models.User || mongoose.model<IUser>("User", userSchema);

UserModel.syncIndexes();
