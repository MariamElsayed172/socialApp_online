"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.s3Event = void 0;
const node_events_1 = require("node:events");
const s3_config_1 = require("./s3.config");
const user_repository_1 = require("../../DB/repository/user.repository");
const user_model_1 = require("../../DB/models/user.model");
exports.s3Event = new node_events_1.EventEmitter({});
exports.s3Event.on("trackProfileImageUpload", (data) => {
    setTimeout(async () => {
        const userModel = new user_repository_1.UserRepository(user_model_1.UserModel);
        try {
            await (0, s3_config_1.getFile)({ Key: data.key });
            await userModel.updateOne({
                filter: { _id: data.userId },
                data: {
                    $unset: { temProfileImage: 1 },
                }
            });
            await (0, s3_config_1.deleteFile)({ Key: data.oldKey });
            console.log('Done');
        }
        catch (error) {
            if (error.code === "NoSuchKey") {
                let unsetData = { temProfileImage: 1 };
                if (!data.oldKey) {
                    unsetData = { temProfileImage: 1, profileImage: 1 };
                }
                await userModel.updateOne({
                    filter: { _id: data.userId },
                    data: {
                        profileImage: data.oldKey,
                        $unset: unsetData,
                    }
                });
            }
        }
    }, data.expiresIn || Number(process.env.AWS_PRE_SIGNED_URL_EXPIRES_IN_SECONDS) * 1000);
});
