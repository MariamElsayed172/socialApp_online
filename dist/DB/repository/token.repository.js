"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenRepository = void 0;
const db_repository_1 = require("./db.repository");
class TokenRepository extends db_repository_1.DBRepository {
    model;
    constructor(model) {
        super(model);
        this.model = model;
    }
}
exports.TokenRepository = TokenRepository;
