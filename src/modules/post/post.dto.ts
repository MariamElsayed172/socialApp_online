import z from "zod";
import { likePost } from "./post.validation";

export type LikePostQueryInputsDto = z.infer<typeof likePost.query>;