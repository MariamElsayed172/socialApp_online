
import { EventEmitter } from 'node:events'
import { deleteFile, getFile } from './s3.config';
import { UserRepository } from '../../DB/repository/user.repository';
import { HUserDocument, UserModel } from '../../DB/models/user.model';
import { UpdateQuery } from 'mongoose';

export const s3Event = new EventEmitter({});

s3Event.on("trackProfileImageUpload", (data) => {
    
    setTimeout(async () => {
        const userModel = new UserRepository(UserModel)
        try {
            await getFile({ Key: data.key })
            await userModel.updateOne({
                filter: { _id: data.userId },
                data: {
                    $unset: { temProfileImage: 1 },
                }
            })
            await deleteFile({ Key: data.oldKey })
            console.log('Done');

        } catch (error: any) {
            if (error.code === "NoSuchKey") {
                // console.log(({eD:data}));
                
                let unsetData: UpdateQuery<HUserDocument> = { temProfileImage: 1 };
                if (!data.oldKey) {
                    unsetData = { temProfileImage: 1, profileImage: 1 }
                }
                await userModel.updateOne({
                    filter: { _id: data.userId },
                    data: {
                        profileImage: data.oldKey,
                        $unset: unsetData,
                    }
                })
            }
        }
    }, data.expiresIn || Number(process.env.AWS_PRE_SIGNED_URL_EXPIRES_IN_SECONDS) * 1000);

})