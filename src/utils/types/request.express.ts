import { JwtPayload } from "jsonwebtoken";
import { HUserDocument } from "../../DB/models/user.model";

declare module "express-serve-static-core" {
    interface Request{
        user?:HUserDocument,
        decoded?:JwtPayload
    }
}