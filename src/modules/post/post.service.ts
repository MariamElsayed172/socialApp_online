import type { Request, Response } from "express";
import { successResponse } from "../../utils/response/success.response";
import { CommentRepository, PostRepository, UserRepository } from "../../DB/repository";
import { AvailabilityEnum, HPostDocument, LikeActionEnum, PostModel } from "../../DB/models/post.model";
import { UserModel } from "../../DB/models/user.model";
import { BadRequestException, NotFoundException } from "../../utils/response/error.response";
import { deleteFiles, uploadFiles } from "../../utils/multer/s3.config";
import { v4 as uuid } from "uuid"
import { LikePostQueryInputsDto } from "./post.dto";
import { Types, UpdateQuery } from "mongoose";
import { log } from "console";
import { CommentModel } from "../../DB";
export const postAvailability = (req: Request) => {
    return [
        { availability: AvailabilityEnum.public },
        { availability: AvailabilityEnum.onlyMe, createBy: req.user?._id },
        {
            availability: AvailabilityEnum.friends,
            createBy: { $in: [...(req.user?.friends || []), req.user?._id] },
        },
        {
            availability: AvailabilityEnum.onlyMe,
            tags: { $in: req.user?._id },
        },
    ]
}

class PostService {
    private userModel = new UserRepository(UserModel)
    private postModel = new PostRepository(PostModel)
    private commentModel = new CommentRepository(CommentModel)
    constructor() { }

    createPost = async (req: Request, res: Response): Promise<Response> => {
        if (req.body.tags?.length && (await this.userModel.find({ filter: { _id: { $in: req.body.tags, $ne: req.user?._id } } })).length !== req.body.tags.length) {
            throw new NotFoundException("some of the mentioned users are not exist");
        }
        let attachments: string[] = [];
        let assetsFolderId: string = uuid();
        if (req.files?.length) {
            attachments = await uploadFiles({
                files: req.files as Express.Multer.File[],
                path: `users/${req.user?._id}/post/${assetsFolderId}`
            })
        }
        const [post] = (await this.postModel.create({
            data: [
                {
                    ...req.body,
                    attachments,
                    assetsFolderId,
                    createBy: req.user?._id,
                },
            ]
        })) || []
        if (!post) {
            if (attachments.length) {
                await deleteFiles({ urls: attachments });
            }
            throw new BadRequestException("Fail to create this post");
        }
        return successResponse({ res, statusCode: 201 });
    }

    updatePost = async (req: Request, res: Response): Promise<Response> => {
        const { postId } = req.params as unknown as { postId: Types.ObjectId };
        const post = await this.postModel.findOne({
            filter: {
                _id: postId,
                createBy: req.user?._id,
            }
        })
        if (!post) {
            throw new NotFoundException("fail to find matching result");
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
        const updatedPost = await this.postModel.updateOne({
            filter: { _id: post._id },
            data: [
                {
                    $set: {
                        content: req.body.content,
                        allowComments: req.body.allowComments || post.allowComments,
                        availability: req.body.availability || post.availability,
                        attachments: {
                            $setUnion: [
                                {
                                    $setDifference: [
                                        "$attachments",
                                        req.body.removedAttachments || [],
                                    ],
                                },
                                attachments,
                            ]
                        },
                        tags: {
                            $setUnion: [
                                {
                                    $setDifference: [
                                        "$tags",
                                        (req.body.removedTags || []).map((tag: string) => {
                                            return Types.ObjectId.createFromHexString(tag);
                                        }),
                                    ],
                                },
                                (req.body.tags || []).map((tag: string) => {
                                    return Types.ObjectId.createFromHexString(tag);
                                }),
                            ]
                        }
                    }
                },
            ]
        })

        if (!updatedPost.matchedCount) {
            if (attachments.length) {
                await deleteFiles({ urls: attachments });
            }
            throw new BadRequestException("Fail to create this post");
        } else {
            if (req.body.removedAttachments?.length) {
                await deleteFiles({ urls: req.body.removedAttachments });
            }
        }
        return successResponse({ res });
    }

    likePost = async (req: Request, res: Response): Promise<Response> => {
        const { postId } = req.params as { postId: string };
        const { action } = req.query as LikePostQueryInputsDto;
        let update: UpdateQuery<HPostDocument> = { $addToSet: { likes: req.user?._id } };
        if (action === LikeActionEnum.unlike) {
            update = { $pull: { likes: req.user?._id } };
        }
        const post = await this.postModel.findOneAndUpdate({
            filter: {
                _id: postId,
                $or: postAvailability(req)
            },
            update,
        })
        if (!post) {
            throw new NotFoundException("invalid postId or post not exist")
        }
        return successResponse({ res })
    }

    postList = async (req: Request, res: Response): Promise<Response> => {
        let { page, size } = req.query as unknown as {
            page: number;
            size: number;
        };
        const posts = await this.postModel.paginate({
            filter: {
                $or: postAvailability(req)
            },
            options: {
                populate: [
                    {
                        path: "comments",
                        match: {
                            commentId: { $exists: false },
                            freezedAt: { $exists: false },
                        },
                        populate: [{
                            path: "reply",
                            match: {
                                commentId: { $exists: false },
                                freezedAt: { $exists: false }
                            },
                            populate: [{
                            path: "reply",
                            match: {
                                commentId: { $exists: false },
                                freezedAt: { $exists: false }
                            }
                        }]
                        }],
                    }]
            },
            page,
            size
        })
        // const posts = await this.postModel.findCursor({
        //     filter: {
        //         $or: postAvailability(req)
        //     },
        // })
        return successResponse({ res, data: { posts } });
    }
}
export const postService = new PostService()