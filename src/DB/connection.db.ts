import mongoose, { ConnectOptions } from "mongoose"
import { UserModel } from "./models/user.model";

const connectDB = async (): Promise<void> => {
    try {
        const uri: string = process.env.DB_URI as string;

        if (!uri) {
            throw new Error("Database connection URL is not defined.");
        }

        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 30000,
        } as ConnectOptions);

        await UserModel.syncIndexes();

        console.log("DB connected successfully");
    } catch (error) {
        console.error("Fail to connect to DB", error);
    }
};

export default connectDB;