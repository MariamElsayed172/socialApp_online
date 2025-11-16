import { RoleEnum } from "../../DB/models/user.model";

export const endpoint = {
    profile:[RoleEnum.User, RoleEnum.Admin],
    restoreAccount:[ RoleEnum.Admin],
    hardDelete:[ RoleEnum.Admin],
    dashboard: [RoleEnum.Admin, RoleEnum.SuperAdmin],
    changeRole: [RoleEnum.Admin, RoleEnum.SuperAdmin]
}