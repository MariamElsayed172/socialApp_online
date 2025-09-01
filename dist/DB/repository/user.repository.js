"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const error_response_1 = require("../../utils/response/error.response");
const db_repository_1 = require("./db.repository");
class UserRepository extends db_repository_1.DBRepository {
    model;
    constructor(model) {
        super(model);
        this.model = model;
    }
    async createUser({ data, options, }) {
        const [user] = await this.create({ data, options }) || [];
        if (!user) {
            throw new error_response_1.BadRequestException("fail to create this user");
        }
        return user;
    }
    ;
}
exports.UserRepository = UserRepository;
