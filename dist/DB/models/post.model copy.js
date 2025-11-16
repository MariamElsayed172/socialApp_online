"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostModel = exports.LikeActionEnum = exports.AvailabilityEnum = exports.AllowCommentsEnum = void 0;
const mongoose_1 = require("mongoose");
var AllowCommentsEnum;
(function (AllowCommentsEnum) {
    AllowCommentsEnum["allow"] = "allow";
    AllowCommentsEnum["deny"] = "deny";
})(AllowCommentsEnum || (exports.AllowCommentsEnum = AllowCommentsEnum = {}));
var AvailabilityEnum;
(function (AvailabilityEnum) {
    AvailabilityEnum["public"] = "public";
    AvailabilityEnum["friends"] = "friends";
    AvailabilityEnum["onlyMe"] = "only-me";
})(AvailabilityEnum || (exports.AvailabilityEnum = AvailabilityEnum = {}));
var LikeActionEnum;
(function (LikeActionEnum) {
    LikeActionEnum["like"] = "like";
    LikeActionEnum["unlike"] = "unlike";
})(LikeActionEnum || (exports.LikeActionEnum = LikeActionEnum = {}));
const postSchema = new mongoose_1.Schema({
    content: {
        type: String, maxlength: 500000, required: function () {
            return !this.attachments?.length;
        }
    },
    attachments: [String],
    assetsFolderId: { type: String, required: true },
    availability: { type: String, enum: AvailabilityEnum, default: AvailabilityEnum.public },
    allowComments: { type: String, enum: AllowCommentsEnum, default: AllowCommentsEnum.allow },
    tags: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "user" }],
    likes: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "user" }],
    createBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "user", required: true },
    freezedAt: Date,
    freezedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "user" },
    restoredAt: Date,
    restoredBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "user" },
}, {
    timestamps: true,
});
postSchema.pre(["findOneAndUpdate", "updateOne", "countDocuments"], function (next) {
    const query = this.getQuery();
    if (query.paranoid == false) {
        this.setQuery({ ...query });
    }
    else {
        this.setQuery({ ...query, freezedAt: { $exists: false } });
    }
    next();
});
postSchema.pre(["find", "findOne", "countDocuments"], function (next) {
    const query = this.getQuery();
    if (query.paranoid == false) {
        this.setQuery({ ...query });
    }
    else {
        this.setQuery({ ...query, freezedAt: { $exists: false } });
    }
    next();
});
exports.PostModel = mongoose_1.models.Post || (0, mongoose_1.model)("Post", postSchema);
