import { HydratedDocument, model, models, Schema, Types } from "mongoose";

export enum AllowCommentsEnum {
    allow = "allow",
    deny = "deny",
}

export enum AvailabilityEnum {
    public = "public",
    friends = "friends",
    onlyMe = "only-me"
}

export enum LikeActionEnum {
    like = "like",
    unlike = "unlike",
}
export interface IPost {
    content?: string;
    attachments?: string[];
    assetsFolderId: string;

    availability: AvailabilityEnum;
    allowComments: AllowCommentsEnum;

    tags?: Types.ObjectId[];
    likes?: Types.ObjectId[];

    createBy: Types.ObjectId;

    freezedAt?: Date;
    freezedBy?: Types.ObjectId;

    restoredAt?: Date;
    restoredBy?: Types.ObjectId;

    createdAt: Date;
    updatedAt?: Date;

}

export type HPostDocument = HydratedDocument<IPost>;

const postSchema = new Schema<IPost>(
    {
        content: {
            type: String, maxlength: 500000, required: function () {
                return !this.attachments?.length
            }
        },
        attachments: [String],
        assetsFolderId: { type: String, required: true },

        availability: { type: String, enum: AvailabilityEnum, default: AvailabilityEnum.public },
        allowComments: { type: String, enum: AllowCommentsEnum, default: AllowCommentsEnum.allow },

        tags: [{ type: Schema.Types.ObjectId, ref: "User" }],
        likes: [{ type: Schema.Types.ObjectId, ref: "User" }],

        createBy: { type: Schema.Types.ObjectId, ref: "User", required: true },


        freezedAt: Date,
        freezedBy: { type: Schema.Types.ObjectId, ref: "User" },

        restoredAt: Date,
        restoredBy: { type: Schema.Types.ObjectId, ref: "User" },
    }, {
    timestamps: true,
    strictQuery: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
}
);

postSchema.pre(["findOneAndUpdate", "updateOne", "countDocuments"], function (next) {

    const query = this.getQuery();
    if (query.paranoid == false) {
        this.setQuery({ ...query })
    } else {
        this.setQuery({ ...query, freezedAt: { $exists: false } })
    }
    next()
})

postSchema.pre(["find", "findOne", "countDocuments"], function (next) {

    const query = this.getQuery();
    if (query.paranoid == false) {
        this.setQuery({ ...query })
    } else {
        this.setQuery({ ...query, freezedAt: { $exists: false } })
    }
    next()
})



postSchema.virtual("comments", {
    localField: "_id",
    foreignField: "postId",
    ref: "Comment",
    justOne:true,
})
export const PostModel = models.Post || model<IPost>("Post", postSchema)