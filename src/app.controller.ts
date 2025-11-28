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
import { authRouter, userRouter, postRouter, initializeIo } from './modules';
import { BadRequestException, globalErrorHandling } from './utils/response/error.response';
import connectDB from './DB/connection.db';
import { createGetPreSignedLink, getFile } from './utils/multer/s3.config';

import { promisify } from 'node:util';
import { pipeline } from 'node:stream';
import { chatRouter } from './modules/chat';

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

    //Hooks


    //app-routing
    app.get("/", (req: Request, res: Response) => {
        res.json({ message: `Welcome to ${process.env.APPLICATION_NAME} backend landing page` })
    });

    //sub-app-routing-modules
    app.use("/auth", authRouter)
    app.use("/user", userRouter)
    app.use("/post", postRouter)
    app.use("/chat", chatRouter)

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
        res.set("Cross-Origin-Resource-Policy", "cross-origin")
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
    const httpServer = app.listen(3000, () => {
        console.log(`Server is running on port :::${port}`);

    });
    initializeIo(httpServer)
};
export default bootstrap