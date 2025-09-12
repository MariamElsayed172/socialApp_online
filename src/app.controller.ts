//Setup ENV
import { resolve } from 'node:path';
import { config } from 'dotenv';
config({ path: resolve("./config/.env.development") });
// config({})

//Load express and express types
import type { Response, Request, Express } from 'express';
import express from 'express';

//third party middleware
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit'

//import module routing
import authController from './modules/auth/auth.controller'
import userController from './modules/user/user.controller'
import { BadRequestException, globalErrorHandling } from './utils/response/error.response';
import connectDB from './DB/connection.db';
import { createGetPreSignedLink, getFile } from './utils/multer/s3.config';

import { promisify } from 'node:util';
import { pipeline } from 'node:stream';
const createS3WriteStreamPipe = promisify(pipeline)

//handle base rate limit on all api requests
const limiter = rateLimit({
    windowMs: 60 * 60000,
    limit: 2000,
    message: { error: "Too many request please try again later" },
    statusCode: 429
})



//app-start-point
const bootstrap = async (): Promise<void> => {

    const port = process.env.PORT || 3000;
    const app: Express = express()

    //global app middleware
    app.use(cors(), express.json(), helmet(), limiter);

    //DB
    await connectDB()

    //app-routing
    app.get("/", (req: Request, res: Response) => {
        res.json({ message: `Welcome to ${process.env.APPLICATION_NAME} backend landing page` })
    });

    //sub-app-routing-modules
    app.use("/auth", authController)
    app.use("/user", userController)

    //test-s3
    // app.get("/test", async (req: Request, res: Response) => {
    //     // const { Key } = req.query as {Key:string};
    //     // const result = await deleteFile(({ Key }))

    //     // const result = await deleteFiles({
    //     //     urls: ["SOCIAL_APP/users/68bb6532b495be110a00d75f/2b4c7d92-532b-4f67-93ec-311398ea6d69_YourName-CoverImage.jpg",
    //     //         "SOCIAL_APP/users/68bb6532b495be110a00d75f/983112cf-eeae-4956-8c03-bc13d86a36f4_pre_profileImage.jpg"
    //     //     ],
    //     //     Quiet:true,
    //     // })

    //     await deleteFolderByPrefix({ path: `users/` })
    //     return res.json({ message: "Done", data: {} })
    // })

    //get assets
    app.get("/upload/pre-signed/*path", async (req: Request, res: Response): Promise<Response> => {
        const { downloadName, download = "false", expiresIn = 120 } = req.query as {
            downloadName?: string;
            download?: string;
            expiresIn?: number;
        };
        const { path } = req.params as unknown as { path: string[] }
        const Key = path.join("/")
        const url = await createGetPreSignedLink({
            Key,
            downloadName: downloadName as string,
            download,
            expiresIn,
        })
        return res.json({ message: "Done", data: { url } })


    })

    app.get("/upload/*path", async (req: Request, res: Response): Promise<void> => {
        const { downloadName, download = "false" } = req.query as {
            downloadName?: string;
            download?: string;
        };
        const { path } = req.params as unknown as { path: string[] }
        const Key = path.join("/")
        const s3Response = await getFile({ Key })
        if (!s3Response?.Body) {
            throw new BadRequestException("fail to fetch this asset");
        }
        res.setHeader(
            "Content-type",
            `${s3Response.ContentType || "application/octet-stream"}`
        )
        if (download === "true") {
            res.setHeader(
                "Content-Disposition",
                `attachment; filename="${downloadName || Key.split("/").pop()}"`
            );
        }
        return await createS3WriteStreamPipe(
            s3Response.Body as NodeJS.ReadableStream,
            res
        )

    })
    //In-valid routing
    app.use("{/*dummy}", (req: Request, res: Response) => {
        return res.status(404).json({ message: "Invalid application routing plz check the method and url" })
    })

    //global error handling
    app.use(globalErrorHandling)

    //start server
    app.listen(3000, () => {
        console.log(`Server is running on port :::${port}`);

    });
};
export default bootstrap