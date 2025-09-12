import { RoleEnum } from "../../DB/models/user.model";

export const endpoint = {
    profile:[RoleEnum.User, RoleEnum.Admin],
    restoreAccount:[ RoleEnum.Admin],
    hardDelete:[ RoleEnum.Admin],
}