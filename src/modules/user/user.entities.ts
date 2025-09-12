import {type HUserDocument} from "../../DB/models/user.model"
export interface IProfileResponse {
    url: string;
}
export interface IUserResponse  {
    user: Partial<HUserDocument>;
}

