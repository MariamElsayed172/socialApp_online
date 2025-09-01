//Setup ENV
import { resolve } from 'node:path';
import { config } from 'dotenv';
config({ path: resolve("./config/.env.development") });
// config({})

//Load express and express types
import type { Response, Request, Express, NextFunction } from 'express';
import express from 'express';

//third party middleware
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit'

//import module routing
import authController from './modules/auth/auth.controller'
import userController from './modules/user/user.controller'
import { globalErrorHandling } from './utils/response/error.response';
import connectDB from './DB/connection.db';

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