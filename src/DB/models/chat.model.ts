import { HydratedDocument, model, models, Schema, Types } from "mongoose";
export interface IMessage {
    content: string;
    createdBy: Types.ObjectId;

    createdAt?: Date;
    updatedAt?: Date;
}
export type HMessageDocument = HydratedDocument<IMessage>

export interface IChat {
    //-------------------------------OVO-----------------------///
    participants: Types.ObjectId[];
    messages: IMessage[]
    //-------------------------------OVM-----------------------///
    group?: string;
    group_image?: string;
    roomId?: string;
    //-------------------------------common-----------------------///
    createdBy: Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}
export type HChatDocument = HydratedDocument<IChat>
const messageSchema = new Schema<IMessage>(
    {
        content: { type: String, minlength: 2, maxlength: 500000, required: true },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    }, {
    timestamps: true
}
)
const chatSchema = new Schema<IChat>(
    {
        participants: [
            { type: Schema.Types.ObjectId, ref: "User", required: true },
        ],
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        group: { type: String },
        group_image: { type: String },
        roomId: {
            type: String, required: function () {
                return this.roomId;
            }
        },
        messages: [messageSchema]
    },
    { timestamps: true }
)
export const ChatModel = models.Chat || model<IChat>("Chat", chatSchema)