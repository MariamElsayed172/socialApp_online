import { v4 as uuid } from 'uuid'
import { DeleteObjectCommand, DeleteObjectCommandOutput, DeleteObjectsCommand, DeleteObjectsCommandOutput, GetObjectCommand, GetObjectCommandOutput, ListObjectsV2Command, ObjectCannedACL, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { storageEnum } from './cloud.multer'
import { createReadStream } from 'node:fs'
import { BadRequestException } from '../response/error.response'
import { Upload } from '@aws-sdk/lib-storage'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export const s3Config = () => {
    return new S3Client({
        region: process.env.AWS_REGION as string,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
        }
    })
}

export const uploadFile = async ({
    storageApproach = storageEnum.memory,
    Bucket = process.env.AWS_BUCKET_NAME as string,
    ACL = "private",
    path = "general",
    file,
}:
    {
        storageApproach?: storageEnum;
        Bucket?: string;
        ACL?: ObjectCannedACL;
        path?: string;
        file: Express.Multer.File;
    }
): Promise<string> => {
    const command = new PutObjectCommand({
        Bucket,
        ACL,
        Key: `${process.env.APPLICATION_NAME}/${path}/${uuid()}_${file.originalname}`,
        Body: storageApproach === storageEnum.memory ? file.buffer : createReadStream(file.path),
        ContentType: file.mimetype,
    });

    await s3Config().send(command);
    if (!command?.input.Key) {
        throw new BadRequestException("fail to generate upload key");
    }
    return command.input.Key;
}

export const uploadFiles = async ({
    storageApproach = storageEnum.memory,
    Bucket = process.env.AWS_BUCKET_NAME as string,
    ACL = "private",
    path = "general",
    files,
    useLarge = false,
}:
    {
        storageApproach?: storageEnum;
        Bucket?: string;
        ACL?: ObjectCannedACL;
        path?: string;
        files: Express.Multer.File[];
        useLarge?: boolean;
    }
): Promise<string[]> => {
    let urls: string[] = [];
    if (useLarge) {
        urls = await Promise.all(files.map((file) => {
            return uploadLargeFile({
                storageApproach,
                Bucket,
                ACL,
                path,
                file,
            })
        }))
    } else {
        urls = await Promise.all(files.map((file) => {
            return uploadFile({
                storageApproach,
                Bucket,
                ACL,
                path,
                file,
            })
        }))
    }
    return urls

}

export const uploadLargeFiles = async ({
    storageApproach = storageEnum.disk,
    Bucket = process.env.AWS_BUCKET_NAME as string,
    ACL = "private",
    path = "general",
    files,
}:
    {
        storageApproach?: storageEnum;
        Bucket?: string;
        ACL?: ObjectCannedACL;
        path?: string;
        files: Express.Multer.File[];
    }
): Promise<string[]> => {
    let urls: string[] = [];
    urls = await Promise.all(files.map((file) => {
        return uploadLargeFile({
            storageApproach,
            Bucket,
            ACL,
            path,
            file,
        })
    }))
    return urls

}

export const uploadLargeFile = async ({
    storageApproach = storageEnum.disk,
    Bucket = process.env.AWS_BUCKET_NAME,
    ACL = "private",
    path = "general",
    file,
}:
    {
        storageApproach?: storageEnum;
        Bucket?: string;
        ACL?: ObjectCannedACL;
        path?: string;
        file: Express.Multer.File;
    }
): Promise<string> => {
    const upload = new Upload({
        client: s3Config(),
        params: {
            Bucket,
            ACL,
            Key: `${process.env.APPLICATION_NAME}/${path}/${uuid()}_${file.originalname}`,
            Body: storageApproach === storageEnum.memory ? file.buffer : createReadStream(file.path),
            ContentType: file.mimetype,
        },
    });

    upload.on("httpUploadProgress", (progress) => {
        console.log(`Upload file progress is :::`, progress);

    });

    const { Key } = await upload.done()
    if (!Key) {
        throw new BadRequestException("fail to generate upload key");
    }
    return Key;
}

export const createPreSignedUploadLink = async ({
    Bucket = process.env.AWS_BUCKET_NAME,
    path = "general",
    expiresIn = Number(process.env.AWS_PRE_SIGNED_URL_EXPIRES_IN_SECONDS),
    Originalname,
    ContentType,
}: {
    Bucket?: string;
    path?: string;
    expiresIn?: number;
    Originalname: string;
    ContentType: string;
}): Promise<{ url: string, key: string }> => {
    const command = new PutObjectCommand({
        Bucket,
        Key: `${process.env.APPLICATION_NAME}/${path}/${uuid()}_pre_${Originalname}`,
        ContentType,
    })
    const url = await getSignedUrl(s3Config(), command, { expiresIn })
    if (!url || !command?.input?.Key) {
        throw new BadRequestException("Fail to create pre signed url")
    }
    return { url, key: command.input.Key }
}

export const createGetPreSignedLink = async ({
    Bucket = process.env.AWS_BUCKET_NAME as string,
    Key,
    expiresIn = Number(process.env.AWS_PRE_SIGNED_URL_EXPIRES_IN_SECONDS),
    downloadName = "dummy",
    download = "false",

}: {
    Bucket?: string;
    Key: string;
    expiresIn?: number;
    downloadName?: string;
    download?: string;
}): Promise<string> => {
    const command = new GetObjectCommand({
        Bucket,
        Key,
        ResponseContentDisposition:
            download === "true"
                ? `attachment; filename="${downloadName || Key.split("/").pop()}"`
                : undefined
    })
    const url = await getSignedUrl(s3Config(), command, { expiresIn })
    if (!url) {
        throw new BadRequestException("Fail to create pre signed url")
    }
    return url;
}

export const getFile = async ({
    Bucket = process.env.AWS_BUCKET_NAME as string,
    Key
}: {
    Bucket?: string;
    Key: string;
}): Promise<GetObjectCommandOutput> => {
    const command = new GetObjectCommand({
        Bucket,
        Key,
    })
    return await s3Config().send(command)
}

export const deleteFile = async ({
    Bucket = process.env.AWS_BUCKET_NAME as string,
    Key,
}: {
    Bucket?: string;
    Key: string;
}): Promise<DeleteObjectCommandOutput> => {
    const command = new DeleteObjectCommand({
        Bucket,
        Key
    })
    return await s3Config().send(command)
}

export const deleteFiles = async ({
    Bucket = process.env.AWS_BUCKET_NAME as string,
    urls,
    Quiet = false,
}: {
    Bucket?: string;
    urls: string[];
    Quiet?: boolean;
}): Promise<DeleteObjectsCommandOutput> => {
    const Objects = urls.map(url => {
        return { Key: url };
    })
    const command = new DeleteObjectsCommand({
        Bucket,
        Delete: {
            Objects,
            Quiet,
        }
    })
    return s3Config().send(command)
}

export const listDirectoryFiles = async ({
    Bucket = process.env.AWS_BUCKET_NAME as string,
    path,
}: {
    Bucket?: string;
    path: string
}) => {
    const command = new ListObjectsV2Command({
        Bucket,
        Prefix: `${process.env.APPLICATION_NAME}/${path}`,
    })
    return s3Config().send(command)
}

export const deleteFolderByPrefix = async ({
    Bucket = process.env.AWS_BUCKET_NAME as string,
    path,
    Quiet = false,
}: {
    Bucket?: string;
    path: string;
    Quiet?: boolean;
}):Promise<DeleteObjectsCommandOutput> => {
    const fileList = await listDirectoryFiles({ Bucket, path })

    if (!fileList?.Contents?.length) {
        throw new BadRequestException("empty directory");
    }
    const urls: string[] = fileList.Contents?.map((file) => {
        return file.Key as string;
    })
    return await deleteFiles({ urls, Bucket, Quiet })

}

