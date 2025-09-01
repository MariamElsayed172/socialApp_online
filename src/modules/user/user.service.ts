import { Response, Request } from "express";
import { ILogoutDto } from "./user.dto";
import { UpdateQuery } from "mongoose";
import { createLoginCredentials, createRevokeToken, LogoutEnum } from "../../utils/security/token.security";
import { HUserDocument, IUser, UserModel } from "../../DB/models/user.model";
import { UserRepository } from "../../DB/repository/user.repository";
import { TokenRepository } from "../../DB/repository/token.repository";
import { TokenModel } from "../../DB/models/token.model";
import { JwtPayload } from "jsonwebtoken";

class UserService {
    private userModel = new UserRepository(UserModel)
    private tokenModel = new TokenRepository(TokenModel)
    constructor() { }
    profile = async (req: Request, res: Response): Promise<Response> => {
        return res.json({
            message: "Done",
            data: {
                user: req.user?._id,
                decoded: req.decoded?.iat,
            },
        })
    }

    logout = async (req: Request, res: Response): Promise<Response> => {
        const { flag }: ILogoutDto = req.body;
        let statusCode: number = 200

        const update: UpdateQuery<IUser> = {};
        switch (flag) {
            case LogoutEnum.all:
                update.changeCredentialsTime = new Date();
                break;

            default:
                await createRevokeToken(req.decoded as JwtPayload)
                statusCode=201
                break;
        }

        await this.userModel.updateOne({
            filter: { _id: req.decoded?._id },
            data: update,
        })

        return res.status(statusCode).json({
            message: "Done",

        })
    }

    refreshToken = async(req:Request, res:Response): Promise<Response> =>{
        const credentials = await createLoginCredentials(req.user as HUserDocument);
        await createRevokeToken(req.decoded as JwtPayload)
        return res.status(201).json({messsage: "Done", data:{credentials}});
    }
}
export default new UserService()