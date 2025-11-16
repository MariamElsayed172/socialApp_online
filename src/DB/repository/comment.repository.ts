import { DBRepository } from "./db.repository";
import { IComment as TDocument } from "../models";
import { Model } from "mongoose";


export class CommentRepository extends DBRepository<TDocument>{
    constructor(protected override readonly model:Model<TDocument>){
        super(model)
    }
}