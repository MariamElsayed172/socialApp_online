"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FriendRequest = void 0;
const mongoose_1 = require("mongoose");
const friendRequestSchema = new mongoose_1.Schema({
    createBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    sendTo: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    acceptedAt: Date,
}, {
    timestamps: true, strictQuery: true,
});
friendRequestSchema.pre(["findOneAndUpdate", "updateOne", "countDocuments"], function (next) {
    const query = this.getQuery();
    if (query.paranoid == false) {
        this.setQuery({ ...query });
    }
    else {
        this.setQuery({ ...query, freezedAt: { $exists: false } });
    }
    next();
});
friendRequestSchema.pre(["find", "findOne", "countDocuments"], function (next) {
    const query = this.getQuery();
    if (query.paranoid == false) {
        this.setQuery({ ...query });
    }
    else {
        this.setQuery({ ...query, freezedAt: { $exists: false } });
    }
    next();
});
exports.FriendRequest = mongoose_1.models.FriendRequest || (0, mongoose_1.model)("FriendRequest", friendRequestSchema);
