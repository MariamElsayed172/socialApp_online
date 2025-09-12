
import mongoose, { Schema, Document, Model, HydratedDocument, Types } from "mongoose";

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
    resetPasswordOtp?: string;
    changeCredentialsTime?: Date;
    otpFailedAttempts?: number;
    otpBannedUntil?: Date;
    createdAt: Date;
    deletedAt?: Date;
    freezedAt?: Date;
    freezedBy?: Types.ObjectId;
    restoredAt?: Date;
    restoredBy?: Types.ObjectId;
    // deletedBy?: mongoose.Types.ObjectId;
    // restoreAt?: {type: Date};
    // restoreBy?: mongoose.Types.ObjectId;
    // picture?: { secure_url: string; public_id: string };
    profileImage?: string;
    temProfileImage?: string;
    coverImages?: string[];
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
            required: function () {
                return this.provider === ProviderEnum.Google ? false : true;
            },
        },
        phone: {
            type: String,
            required: function (this: IUser) {
                return this.provider === ProviderEnum.System;
            },
        },
        resetPasswordOtp: { type: String },
        changeCredentialsTime: { type: Date },
        gender: {
            type: String,
            enum: GenderEnum,
            default: GenderEnum.Male,
        },
        role: {
            type: String,
            enum: RoleEnum,
            default: RoleEnum.User,
        },
        provider: {
            type: String,
            enum: ProviderEnum,
            default: ProviderEnum.System,
        },
        confirmEmail: Date,
        confirmEmailOtp: String,
        confirmEmailOtpCreatedAt: Date,
        otpFailedAttempts: { type: Number, default: 0 },
        otpBannedUntil: Date,

        freezedAt: Date,
        freezedBy: { type: Schema.Types.ObjectId, ref: "User" },
        restoredAt: Date,
        restoredBy: { type: Schema.Types.ObjectId, ref: "User" },
        // deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        // restoreAt: {type: Date},
        // restoreBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        // picture: {
        //     secure_url: String,
        //     public_id: String,
        // },
        profileImage: { type: String },
        temProfileImage: { type: String },
        coverImages: [String],
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
    .get(function () {
        return `${this.firstName} ${this.lastName}`;
    })
    .set(function (value: string) {
        const [firstName, lastName] = value?.split(" ") || [];
        this.set({ firstName, lastName });
    });



export const UserModel: Model<IUser> =
    mongoose.models.User || mongoose.model<IUser>("User", userSchema);
export type HUserDocument = HydratedDocument<IUser>

