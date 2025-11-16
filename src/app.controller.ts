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
import { authRouter, userRouter, postRouter } from './modules';
import { BadRequestException, globalErrorHandling } from './utils/response/error.response';
import connectDB from './DB/connection.db';
import { createGetPreSignedLink, getFile } from './utils/multer/s3.config';

import { promisify } from 'node:util';
import { pipeline } from 'node:stream';

const createS3WriteStreamPipe = promisify(pipeline)
import { Server, Socket } from 'socket.io'
import { decodeToken, TokenEnum } from './utils/security/token.security';
import { log } from 'node:console';
import { HUserDocument } from './DB';
import { JwtPayload } from 'jsonwebtoken';

//handle base rate limit on all api requests
const limiter = rateLimit({
    windowMs: 60 * 60000,
    limit: 2000,
    message: { error: "Too many request please try again later" },
    statusCode: 429
})

const connectedSockets = new Map<string, string[]>();

interface IAuthSocket extends Socket {
    credentials?: {
        user: Partial<HUserDocument>,
        decoded: JwtPayload,
    }
}
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
    const io = new Server(httpServer, {
        cors: {
            origin: "*",
        }
    });
    io.use(async (socket: IAuthSocket, next) => {
        try {
            const { user, decoded } = await decodeToken({
                authorization: socket.handshake?.auth.authorization || "",
                tokenType: TokenEnum.access,
            });

            const userTabs = connectedSockets.get((user._id as string).toString()) || [];
            userTabs.push(socket.id);
            connectedSockets.set((user._id as string).toString(), userTabs);
            socket.credentials = { user, decoded };
            next();
        } catch (error: any) {
            next(error);
        }
    })
    //listen to => http://localhost:3000/
    io.on("connection", (socket: IAuthSocket) => {

        // socket.on("sayHi", (data, callback) => {
        //     console.log({ data });
        //     callback("Hello BE To FE")
        // })
        console.log({ connectedSockets });

        socket.on("disconnect", () => {

            const userId = socket.credentials?.user._id?.toString() as string;
            let remainingTabs = connectedSockets.get(userId)?.filter((tab: string) => {
                return tab !== socket.id;
            }) || [];
            if (remainingTabs?.length) {
                connectedSockets.set(userId, remainingTabs);
            } else {
                connectedSockets.delete(userId)
                io.emit("offline_user", userId)
            }
            console.log(`Logout from ::: ${socket.id}`);
            console.log({ after_Disconnect: connectedSockets });


        })
    })

    //listen to => http://localhost:3000/admin
    // io.of("/admin").on("connection", (socket: Socket) => {
    //     console.log("Admin:: :",socket.id);
    //     socket.on("disconnect", ()=>{
    //         console.log(`Logout from ::: ${socket.id}`);

    //     })
    // })
};
export default bootstrap