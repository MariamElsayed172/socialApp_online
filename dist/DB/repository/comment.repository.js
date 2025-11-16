"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentRepository = void 0;
const db_repository_1 = require("./db.repository");
class CommentRepository extends db_repository_1.DBRepository {
    model;
    constructor(model) {
        super(model);
        this.model = model;
    }
}
exports.CommentRepository = CommentRepository;
