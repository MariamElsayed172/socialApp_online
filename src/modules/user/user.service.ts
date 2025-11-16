import { Response, Request } from "express";
import { IFreezeAccountDTO, IHardDeleteAccountDTO, ILogoutDto, IRestoreAccountDTO } from "./user.dto";
import { Types, UpdateQuery } from "mongoose";
import { createLoginCredentials, createRevokeToken, LogoutEnum } from "../../utils/security/token.security";

import { JwtPayload } from "jsonwebtoken";
import { createGetPreSignedLink, createPreSignedUploadLink, deleteFiles, deleteFolderByPrefix, uploadFiles } from "../../utils/multer/s3.config";
import { storageEnum } from "../../utils/multer/cloud.multer";
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, UnauthorizedException } from "../../utils/response/error.response";
import { s3Event } from "../../utils/multer/s3.events";
import { successResponse } from "../../utils/response/success.response";
import { IProfileResponse, IUserResponse } from "./user.entities";
import { ILoginResponse } from "../auth/auth.entities";
import { PostRepository, UserRepository, PostModel, HUserDocument, IUser, RoleEnum, UserModel, FriendRequest, FriendRequestRepository } from "../../DB";


class UserService {
    private userModel = new UserRepository(UserModel)
    private friendRequestModel = new FriendRequestRepository(FriendRequest)
    private postModel = new PostRepository(PostModel)
    constructor() { }


    profileImage = async (req: Request, res: Response): Promise<Response> => {

        // console.log("REQ BODY:", req.body);
        const { ContentType, Originalname }: { ContentType: string, Originalname: string } = req.body

        const { url, key } = await createPreSignedUploadLink({ ContentType, Originalname, path: `users/${req.user?._id}` })
        console.log("UPLOAD KEY:", key);
        const user = await this.userModel.findByIdAndUpdate({
            id: req.user?._id as Types.ObjectId,
            update: {
                profileImage: key,
                temProfileImage: req.user?.profileImage,
            },
        })
        if (!user) {
            throw new BadRequestException("Fail to update user profile image")
        }
        console.log("GET KEY:", key);

        s3Event.emit("trackProfileImageUpload", { userId: req.user?._id, oldKey: req.user?.profileImage, key, expiresIn: 3000 })
        return successResponse<IProfileResponse>({ res, data: { url } })
    }

    profileCoverImage = async (req: Request, res: Response): Promise<Response> => {
        const urls = await uploadFiles({
            storageApproach: storageEnum.disk,
            files: req.files as Express.Multer.File[],
            path: `users/${req.decoded?._id}/cover`,
            useLarge: true,
        })
        const user = await this.userModel.findByIdAndUpdate({
            id: req.user?._id as Types.ObjectId,
            update: {
                coverImages: urls
            }
        })
        if (!user) {
            throw new BadRequestException("Fail to update profile cover images")
        }
        if (req.user?.coverImages) {
            await deleteFiles({ urls: req.user.coverImages })
        }
        return successResponse<IUserResponse>({ res, data: { user } })
    }


    profile = async (req: Request, res: Response): Promise<Response> => {
        if (!req.user) {
            throw new UnauthorizedException("missing user details");
        }
        const profile = await this.userModel.findById({
            id:req.user?._id as Types.ObjectId,
            options:{
                populate:[
                    {
                        path:"friends",
                        select:"firstName lastName email gender profilePicture",
                    }
                ]
            }
        })
        if(!profile){
            throw new NotFoundException("fail to find user profile")
        }
        
        return successResponse<IUserResponse>({ res, data: { user: profile } })
    }

    dashboard = async (req: Request, res: Response): Promise<Response> => {
        const results = await Promise.allSettled([
            this.userModel.find({ filter: {} }),
            this.postModel.find({ filter: {} })
        ])

        return successResponse({ res, data: { results } })
    }

    changeRole = async (req: Request, res: Response): Promise<Response> => {
        const { userId } = req.params as unknown as { userId: Types.ObjectId };
        const { role }: { role: RoleEnum } = req.body
        const denyRoles: RoleEnum[] = [role, RoleEnum.SuperAdmin]
        if (req.user?.role === RoleEnum.Admin) {
            denyRoles.push(RoleEnum.Admin)
        }
        const user = await this.userModel.findOneAndUpdate({
            filter: {
                _id: userId as Types.ObjectId,
                role: { $nin: denyRoles }
            },
            update: {
                role,
            }
        });
        if (!user) {
            throw new NotFoundException("fail to find matching result")
        }

        return successResponse({ res, })
    }

    sendFriendRequest = async (req: Request, res: Response): Promise<Response> => {
        const { userId } = req.params as unknown as { userId: Types.ObjectId };
        const checkFriendRequestExist = await this.friendRequestModel.findOne({
            filter: {
                createBy: { $in: [req.user?._id, userId] },
                sendTo: { $in: [req.user?._id, userId] },
            }
        })
        if (checkFriendRequestExist) {
            throw new ConflictException("Friend request already exist")
        }
        const user = await this.userModel.findOne({ filter: { _id: userId } })

        if (!user) {
            throw new NotFoundException("invalid recipient")
        }
        const [friendRequest] = (await this.friendRequestModel.create({
            data: [{
                createBy: req.user?._id as Types.ObjectId,
                sendTo: userId,
            }]
        })) || []
        if (!friendRequest) {
            throw new BadRequestException("something went wrong!!!")
        }
        return successResponse({ res, statusCode: 201 })
    }

    acceptFriendRequest = async (req: Request, res: Response): Promise<Response> => {
        const { requestId } = req.params as unknown as { requestId: Types.ObjectId };
        const friendRequest = await this.friendRequestModel.findOneAndUpdate({
            filter: {
                _id: requestId,
                sendTo: req.user?._id,
                acceptedAt: { $exists: false },
            },
            update: {
                acceptedAt: new Date()
            }
        })
        if (!friendRequest) {
            throw new NotFoundException("fail to find matching result")
        }
        await Promise.all([
            await this.userModel.updateOne({
                filter: { _id: friendRequest.createBy },
                data: {
                    $addToSet: { friends: friendRequest.sendTo }
                }
            }),
            await this.userModel.updateOne({
                filter: { _id: friendRequest.sendTo },
                data: {
                    $addToSet: { friends: friendRequest.createBy }
                }
            }),
        ])
        return successResponse({ res })
    }

    freezeAccount = async (req: Request, res: Response): Promise<Response> => {
        const { userId } = req.params as IFreezeAccountDTO || {};
        if (userId && req.user?.role !== RoleEnum.Admin) {
            throw new ForbiddenException("not authorized")
        }
        const user = await this.userModel.updateOne({
            filter: {
                _id: userId || req.user?._id,
                freezedAt: { $exists: false }
            },
            data: {
                freezedAt: new Date(),
                freezedBy: req.user?._id,
                changeCredentialsTime: new Date(),
                $unset: {
                    restoredAt: 1,
                    restoredBy: 1,
                }
            }
        })
        if (!user.matchedCount) {
            throw new NotFoundException("user not found or fail to delete this resource")
        }
        return successResponse({ res })
    }

    restoreAccount = async (req: Request, res: Response): Promise<Response> => {
        const { userId } = req.params as IRestoreAccountDTO;

        const user = await this.userModel.updateOne({
            filter: {
                _id: userId,
                freezedBy: { $ne: userId },
            },
            data: {
                restoredAt: new Date(),
                restoredBy: req.user?._id,
                $unset: {
                    freezedAt: 1,
                    freezedBy: 1,
                }
            }
        })
        if (!user.matchedCount) {
            throw new NotFoundException("user not found or fail to restore this resource")
        }
        return res.json({ message: "Done" })
    }

    hardDeleteAccount = async (req: Request, res: Response): Promise<Response> => {
        const { userId } = req.params as IHardDeleteAccountDTO;

        const user = await this.userModel.deleteOne({
            filter: {
                _id: userId,
                freezedAt: { $exists: true },
            },

        })
        if (!user.deletedCount) {
            throw new NotFoundException("user not found or fail to hard delete this resource")
        }
        await deleteFolderByPrefix({ path: `users/${userId}` })
        return res.json({ message: "Done" })
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
                statusCode = 201
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

    refreshToken = async (req: Request, res: Response): Promise<Response> => {
        const credentials = await createLoginCredentials(req.user as HUserDocument);
        await createRevokeToken(req.decoded as JwtPayload)
        return successResponse<ILoginResponse>({ res, statusCode: 201, data: { credentials } })
    }
}
export default new UserService()