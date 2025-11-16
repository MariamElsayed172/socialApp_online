import type { Request, Response } from "express";
import { successResponse } from "../../utils/response/success.response";
import { CommentRepository, PostRepository, UserRepository, CommentModel, PostModel, UserModel, AllowCommentsEnum, HPostDocument } from "../../DB";
import { Types } from "mongoose";
import { postAvailability } from "../post";
import { NotFound } from "@aws-sdk/client-s3";
import { BadRequestException, NotFoundException } from "../../utils/response/error.response";
import { deleteFiles, uploadFiles } from "../../utils/multer/s3.config";

class CommentService {
    private userModel = new UserRepository(UserModel)
    private postModel = new PostRepository(PostModel)
    private commentModel = new CommentRepository(CommentModel)

    constructor() { }
    createComment = async (req: Request, res: Response): Promise<Response> => {
        const { postId } = req.params as unknown as { postId: Types.ObjectId };
        const post = await this.postModel.findOne({
            filter: {
                _id: postId,
                allowComments: AllowCommentsEnum.allow,
                $or: postAvailability(req)
            },
        });
        if (!post) {
            throw new NotFoundException("Fail to find matching result");
        }
        if (req.body.tags?.length && (await this.userModel.find({ filter: { _id: { $in: req.body.tags, $ne: req.user?._id } } })).length !== req.body.tags.length) {
            throw new NotFoundException("some of the mentioned users are not exist");
        }
        let attachments: string[] = [];
        if (req.files?.length) {
            attachments = await uploadFiles({
                files: req.files as Express.Multer.File[],
                path: `users/${post.createBy}/post/${post.assetsFolderId}`
            })
        }
        const [comment] = (await this.commentModel.create({
            data: [
                {
                    ...req.body,
                    attachments,
                    postId,
                    createBy: req.user?._id,
                },
            ]
        })) || []
        if (!comment) {
            if (attachments.length) {
                await deleteFiles({ urls: attachments });
            }
            throw new BadRequestException("Fail to create this comment");
        }
        return successResponse({ res, statusCode: 201 });
    }

    replyOnComment = async (req: Request, res: Response): Promise<Response> => {
        const { postId, commentId } = req.params as unknown as { postId: Types.ObjectId; commentId: Types.ObjectId; };
        const comment = await this.commentModel.findOne({
            filter: {
                _id: commentId,
                postId,
            },
            options: {
                populate: [{
                    path: "postId", match: {
                        allowComments: AllowCommentsEnum.allow,
                        $or: postAvailability(req)
                    }
                }]
            }
        });
        if (!comment?.postId) {
            throw new NotFoundException("Fail to find matching result");
        }
        if (req.body.tags?.length && (await this.userModel.find({ filter: { _id: { $in: req.body.tags, $ne: req.user?._id } } })).length !== req.body.tags.length) {
            throw new NotFoundException("some of the mentioned users are not exist");
        }
        let attachments: string[] = [];
        if (req.files?.length) {
            const post = comment.postId as Partial<HPostDocument>
            attachments = await uploadFiles({
                files: req.files as Express.Multer.File[],
                path: `users/${post.createBy}/post/${post.assetsFolderId}`
            })
        }
        const [reply] = (await this.commentModel.create({
            data: [
                {
                    ...req.body,
                    attachments,
                    postId,
                    commentId,
                    createBy: req.user?._id,
                },
            ]
        })) || []
        if (!reply) {
            if (attachments.length) {
                await deleteFiles({ urls: attachments });
            }
            throw new BadRequestException("Fail to create this comment");
        }
        return successResponse({ res, statusCode: 201 });
    }
}
export default new CommentService()