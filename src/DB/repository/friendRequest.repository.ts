import { DBRepository, Lean } from "./db.repository";
import { IFriendRequest as TDocument } from "../models";
import { Model } from "mongoose";


export class FriendRequestRepository extends DBRepository<TDocument> {
    constructor(protected override readonly model: Model<TDocument>) {
        super(model)
    }


}