import {z} from 'zod'
import { LogoutEnum } from '../../utils/security/token.security'

export const logout = {
    body:z.strictObject({
        flag:z.enum(LogoutEnum).default(LogoutEnum.only)
    })
}