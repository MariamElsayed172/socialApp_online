import {z} from "zod"
import { logout } from "./user.validation"

export type ILogoutDto = z.infer<typeof logout.body>