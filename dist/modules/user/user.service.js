"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const token_security_1 = require("../../utils/security/token.security");
const s3_config_1 = require("../../utils/multer/s3.config");
const cloud_multer_1 = require("../../utils/multer/cloud.multer");
const error_response_1 = require("../../utils/response/error.response");
const s3_events_1 = require("../../utils/multer/s3.events");
const success_response_1 = require("../../utils/response/success.response");
const DB_1 = require("../../DB");
class UserService {
    userModel = new DB_1.UserRepository(DB_1.UserModel);
    friendRequestModel = new DB_1.FriendRequestRepository(DB_1.FriendRequest);
    postModel = new DB_1.PostRepository(DB_1.PostModel);
    constructor() { }
    profileImage = async (req, res) => {
        const { ContentType, Originalname } = req.body;
        const { url, key } = await (0, s3_config_1.createPreSignedUploadLink)({ ContentType, Originalname, path: `users/${req.user?._id}` });
        console.log("UPLOAD KEY:", key);
        const user = await this.userModel.findByIdAndUpdate({
            id: req.user?._id,
            update: {
                profileImage: key,
                temProfileImage: req.user?.profileImage,
            },
        });
        if (!user) {
            throw new error_response_1.BadRequestException("Fail to update user profile image");
        }
        console.log("GET KEY:", key);
        s3_events_1.s3Event.emit("trackProfileImageUpload", { userId: req.user?._id, oldKey: req.user?.profileImage, key, expiresIn: 3000 });
        return (0, success_response_1.successResponse)({ res, data: { url } });
    };
    profileCoverImage = async (req, res) => {
        const urls = await (0, s3_config_1.uploadFiles)({
            storageApproach: cloud_multer_1.storageEnum.disk,
            files: req.files,
            path: `users/${req.decoded?._id}/cover`,
            useLarge: true,
        });
        const user = await this.userModel.findByIdAndUpdate({
            id: req.user?._id,
            update: {
                coverImages: urls
            }
        });
        if (!user) {
            throw new error_response_1.BadRequestException("Fail to update profile cover images");
        }
        if (req.user?.coverImages) {
            await (0, s3_config_1.deleteFiles)({ urls: req.user.coverImages });
        }
        return (0, success_response_1.successResponse)({ res, data: { user } });
    };
    profile = async (req, res) => {
        if (!req.user) {
            throw new error_response_1.UnauthorizedException("missing user details");
        }
        const profile = await this.userModel.findById({
            id: req.user?._id,
            options: {
                populate: [
                    {
                        path: "friends",
                        select: "firstName lastName email gender profilePicture",
                    }
                ]
            }
        });
        if (!profile) {
            throw new error_response_1.NotFoundException("fail to find user profile");
        }
        return (0, success_response_1.successResponse)({ res, data: { user: profile } });
    };
    dashboard = async (req, res) => {
        const results = await Promise.allSettled([
            this.userModel.find({ filter: {} }),
            this.postModel.find({ filter: {} })
        ]);
        return (0, success_response_1.successResponse)({ res, data: { results } });
    };
    changeRole = async (req, res) => {
        const { userId } = req.params;
        const { role } = req.body;
        const denyRoles = [role, DB_1.RoleEnum.SuperAdmin];
        if (req.user?.role === DB_1.RoleEnum.Admin) {
            denyRoles.push(DB_1.RoleEnum.Admin);
        }
        const user = await this.userModel.findOneAndUpdate({
            filter: {
                _id: userId,
                role: { $nin: denyRoles }
            },
            update: {
                role,
            }
        });
        if (!user) {
            throw new error_response_1.NotFoundException("fail to find matching result");
        }
        return (0, success_response_1.successResponse)({ res, });
    };
    sendFriendRequest = async (req, res) => {
        const { userId } = req.params;
        const checkFriendRequestExist = await this.friendRequestModel.findOne({
            filter: {
                createBy: { $in: [req.user?._id, userId] },
                sendTo: { $in: [req.user?._id, userId] },
            }
        });
        if (checkFriendRequestExist) {
            throw new error_response_1.ConflictException("Friend request already exist");
        }
        const user = await this.userModel.findOne({ filter: { _id: userId } });
        if (!user) {
            throw new error_response_1.NotFoundException("invalid recipient");
        }
        const [friendRequest] = (await this.friendRequestModel.create({
            data: [{
                    createBy: req.user?._id,
                    sendTo: userId,
                }]
        })) || [];
        if (!friendRequest) {
            throw new error_response_1.BadRequestException("something went wrong!!!");
        }
        return (0, success_response_1.successResponse)({ res, statusCode: 201 });
    };
    acceptFriendRequest = async (req, res) => {
        const { requestId } = req.params;
        const friendRequest = await this.friendRequestModel.findOneAndUpdate({
            filter: {
                _id: requestId,
                sendTo: req.user?._id,
                acceptedAt: { $exists: false },
            },
            update: {
                acceptedAt: new Date()
            }
        });
        if (!friendRequest) {
            throw new error_response_1.NotFoundException("fail to find matching result");
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
        ]);
        return (0, success_response_1.successResponse)({ res });
    };
    freezeAccount = async (req, res) => {
        const { userId } = req.params || {};
        if (userId && req.user?.role !== DB_1.RoleEnum.Admin) {
            throw new error_response_1.ForbiddenException("not authorized");
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
        });
        if (!user.matchedCount) {
            throw new error_response_1.NotFoundException("user not found or fail to delete this resource");
        }
        return (0, success_response_1.successResponse)({ res });
    };
    restoreAccount = async (req, res) => {
        const { userId } = req.params;
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
        });
        if (!user.matchedCount) {
            throw new error_response_1.NotFoundException("user not found or fail to restore this resource");
        }
        return res.json({ message: "Done" });
    };
    hardDeleteAccount = async (req, res) => {
        const { userId } = req.params;
        const user = await this.userModel.deleteOne({
            filter: {
                _id: userId,
                freezedAt: { $exists: true },
            },
        });
        if (!user.deletedCount) {
            throw new error_response_1.NotFoundException("user not found or fail to hard delete this resource");
        }
        await (0, s3_config_1.deleteFolderByPrefix)({ path: `users/${userId}` });
        return res.json({ message: "Done" });
    };
    logout = async (req, res) => {
        const { flag } = req.body;
        let statusCode = 200;
        const update = {};
        switch (flag) {
            case token_security_1.LogoutEnum.all:
                update.changeCredentialsTime = new Date();
                break;
            default:
                await (0, token_security_1.createRevokeToken)(req.decoded);
                statusCode = 201;
                break;
        }
        await this.userModel.updateOne({
            filter: { _id: req.decoded?._id },
            data: update,
        });
        return res.status(statusCode).json({
            message: "Done",
        });
    };
    refreshToken = async (req, res) => {
        const credentials = await (0, token_security_1.createLoginCredentials)(req.user);
        await (0, token_security_1.createRevokeToken)(req.decoded);
        return (0, success_response_1.successResponse)({ res, statusCode: 201, data: { credentials } });
    };
}
exports.default = new UserService();
