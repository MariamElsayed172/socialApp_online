"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostRepository = void 0;
const db_repository_1 = require("./db.repository");
const models_1 = require("../models");
const comment_repository_1 = require("./comment.repository");
class PostRepository extends db_repository_1.DBRepository {
    model;
    commentModel = new comment_repository_1.CommentRepository(models_1.CommentModel);
    constructor(model) {
        super(model);
        this.model = model;
    }
    async findCursor({ filter, select, options }) {
        let result = [];
        const cursor = this.model
            .find(filter || {})
            .select(select || "")
            .populate(options?.populate)
            .cursor();
        for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
            const comments = await this.commentModel.find({
                filter: { postId: doc._id, commentId: { $exists: false } },
            });
            result.push({ post: doc, comments });
        }
        return result;
    }
    ;
}
exports.PostRepository = PostRepository;
