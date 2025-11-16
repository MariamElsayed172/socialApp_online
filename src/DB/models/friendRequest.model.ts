import { HydratedDocument, model, models, Schema, Types } from "mongoose";


export interface IFriendRequest {
    createBy: Types.ObjectId;
    sendTo: Types.ObjectId;

    acceptedAt?: Date;
    createdAt: Date;
    updatedAt?: Date;

}

export type HFriendRequestDocument = HydratedDocument<IFriendRequest>;

const friendRequestSchema = new Schema<IFriendRequest>(
    {


        createBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        sendTo: { type: Schema.Types.ObjectId, ref: "User", required: true },
        acceptedAt: Date,

    }, {
    timestamps: true, strictQuery: true,
}
);

friendRequestSchema.pre(["findOneAndUpdate", "updateOne", "countDocuments"], function (next) {

    const query = this.getQuery();
    if (query.paranoid == false) {
        this.setQuery({ ...query })
    } else {
        this.setQuery({ ...query, freezedAt: { $exists: false } })
    }
    next()
})

friendRequestSchema.pre(["find", "findOne", "countDocuments"], function (next) {

    const query = this.getQuery();
    if (query.paranoid == false) {
        this.setQuery({ ...query })
    } else {
        this.setQuery({ ...query, freezedAt: { $exists: false } })
    }
    next()
})


export const FriendRequest = models.FriendRequest || model<IFriendRequest>("FriendRequest", friendRequestSchema)