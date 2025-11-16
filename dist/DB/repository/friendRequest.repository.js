"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FriendRequestRepository = void 0;
const db_repository_1 = require("./db.repository");
class FriendRequestRepository extends db_repository_1.DBRepository {
    model;
    constructor(model) {
        super(model);
        this.model = model;
    }
}
exports.FriendRequestRepository = FriendRequestRepository;
