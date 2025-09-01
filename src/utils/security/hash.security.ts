import { compare, hash, genSalt } from "bcrypt"


export const generateHash = async (plainText:string, salt:number=Number(process.env.SALT)):Promise<string> =>{
    return await hash(plainText, salt)
}

export const compareHash = async (plainText:string, hash:string):Promise<boolean> =>{
    return await compare(plainText, hash);
}