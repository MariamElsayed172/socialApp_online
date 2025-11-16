import { Model, CreateOptions, HydratedDocument } from "mongoose";
import { BadRequestException } from "../../utils/response/error.response";
import { IUser } from "../models";
import { DBRepository } from "./db.repository";


export class UserRepository extends DBRepository<IUser> {
    constructor(protected override readonly model: Model<IUser>) {
        super(model)
    }


    async createUser({
        data,
        options,
    }: {
        data: Partial<IUser>[];
        options?: CreateOptions;
    }): Promise<HydratedDocument<IUser>> {
        const [user] = await this.create({data, options}) || [];
        if(!user){
            throw new BadRequestException("fail to create this user");
        }
        return user;
    };
}