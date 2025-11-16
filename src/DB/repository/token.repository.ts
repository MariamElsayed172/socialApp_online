import { DBRepository } from "./db.repository";
import { IToken as TDocument } from "../models";
import { Model } from "mongoose";


export class TokenRepository extends DBRepository<TDocument>{
    constructor(protected override readonly model:Model<TDocument>){
        super(model)
    }
}