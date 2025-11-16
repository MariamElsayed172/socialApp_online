
import mongoose, { Schema, Document, Model, HydratedDocument, Types, UpdateQuery } from "mongoose";
import { generateHash } from "../../utils/security/hash.security";
import { emailEvent } from "../../utils/email/email.event";

export enum GenderEnum {
    Male = "male",
    Female = "female",
}

export enum RoleEnum {
    User = "user",
    Admin = "admin",
    SuperAdmin = "super-admin"
}

export enum ProviderEnum {
    System = "system",
    Google = "google",
}

export interface IUser extends Document {
    firstName: string;
    lastName: string;
    slug: string;
    email: string;
    password: string;
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
    friends?: Types.ObjectId[];
}

export type HUserDocument = HydratedDocument<IUser>;
const userSchema = new Schema<IUser>(
    {
        firstName: { type: String, required: true, minlength: 2, maxlength: 25 },
        lastName: { type: String, required: true, minlength: 2, maxlength: 25 },
        slug: { type: String, required: true, minlength: 5, maxlength: 51 },
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
        friends: [{ type: Schema.Types.ObjectId, ref: "User" }],
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
        this.set({ firstName, lastName, slug: value.replaceAll(/\s+/g, "-") });
    });

// userSchema.pre(["findOneAndUpdate", "updateOne"], async function (next) {
//     const query = this.getQuery();
//     const update = this.getUpdate() as UpdateQuery<HUserDocument>;
//     if (update.freezedAt) {
//         this.setUpdate({ ...update, changeCredentialsTime: new Date() });
//     }

//     console.log({ query, update });
// })

// userSchema.post(["findOneAndUpdate", "updateOne"], async function (doc, next) {
//     const query = this.getQuery();
//     const update = this.getUpdate() as UpdateQuery<HUserDocument>;

//     if (update["$set"].changeCredentialsTime) {
//         const tokenModel = new TokenRepository(TokenModel);
//         await tokenModel.deleteMany({ filter: { userId: query._id } })
//     }

//     console.log({ query, update: update["$set"].changeCredentialsTime });
// })

// userSchema.post(["deleteOne", "findOneAndDelete"], async function (doc, next) {
//     const query = this.getQuery();
//     const tokenModel = new TokenRepository(TokenModel);
//     await tokenModel.deleteMany({ filter: { userId: query._id } })

// })

// userSchema.pre("insertMany", async function (next, docs) {
//     console.log({this: this, docs});
//     for(const doc of docs){
//         doc.password = await generateHash(doc.password)
//     }

// })

userSchema.pre("save", async function (this: HUserDocument & { wasNew: boolean; confirmEmailPlainOtp?: string }, next) {
    this.wasNew = this.isNew;
    if (this.isModified("password")) {
        this.password = await generateHash(this.password)
    }

    if (this.isModified("confirmEmailOtp")) {
        this.confirmEmailPlainOtp = this.confirmEmailOtp as string;
        this.confirmEmailOtp = await generateHash(this.confirmEmailOtp as string)
    }
    next()

})

userSchema.post("save", async function (doc, next) {
    const that = this as HUserDocument & { wasNew: boolean; confirmEmailPlainOtp?: string }
    if (that.wasNew && that.confirmEmailPlainOtp) {
        emailEvent.emit("confirmEmail", {
            to: this.email,
            otp: that.confirmEmailPlainOtp
        })
    }
    next()
})

userSchema.pre(["find", "findOne"], function (next) {

    const query = this.getQuery();
    if (query.paranoid == false) {
        this.setQuery({ ...query })
    } else {
        this.setQuery({ ...query, freezedAt:{$exists:false} })
    }
    next()
})




export const UserModel: Model<IUser> =
    mongoose.models.User || mongoose.model<IUser>("User", userSchema);


