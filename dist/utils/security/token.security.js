"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRevokeToken = exports.decodeToken = exports.createLoginCredentials = exports.getSignatures = exports.detectSignatureLevel = exports.verifyToken = exports.generateToken = exports.TokenEnum = exports.LogoutEnum = exports.SignatureLevelEnum = void 0;
const uuid_1 = require("uuid");
const jsonwebtoken_1 = require("jsonwebtoken");
const user_model_1 = require("../../DB/models/user.model");
const error_response_1 = require("../response/error.response");
const repository_1 = require("../../DB/repository");
const token_model_1 = require("../../DB/models/token.model");
const userModel = new repository_1.UserRepository(user_model_1.UserModel);
var SignatureLevelEnum;
(function (SignatureLevelEnum) {
    SignatureLevelEnum["Bearer"] = "Bearer";
    SignatureLevelEnum["System"] = "System";
})(SignatureLevelEnum || (exports.SignatureLevelEnum = SignatureLevelEnum = {}));
var LogoutEnum;
(function (LogoutEnum) {
    LogoutEnum["only"] = "only";
    LogoutEnum["all"] = "all";
})(LogoutEnum || (exports.LogoutEnum = LogoutEnum = {}));
var TokenEnum;
(function (TokenEnum) {
    TokenEnum["access"] = "access";
    TokenEnum["refresh"] = "refresh";
})(TokenEnum || (exports.TokenEnum = TokenEnum = {}));
const generateToken = async ({ payload, secret = process.env.ACCESS_USER_TOKEN_SIGNATURE, options = { expiresIn: Number(process.env.ACCESS_TOKEN_EXPIRES_IN) }, }) => {
    return (0, jsonwebtoken_1.sign)(payload, secret, options);
};
exports.generateToken = generateToken;
const verifyToken = async ({ token, secret = process.env.ACCESS_USER_TOKEN_SIGNATURE, }) => {
    return (0, jsonwebtoken_1.verify)(token, secret);
};
exports.verifyToken = verifyToken;
const detectSignatureLevel = async (role = user_model_1.RoleEnum.User) => {
    let signatureLevel = SignatureLevelEnum.Bearer;
    switch (role) {
        case user_model_1.RoleEnum.Admin:
        case user_model_1.RoleEnum.SuperAdmin:
            signatureLevel = SignatureLevelEnum.System;
            break;
        default:
            signatureLevel = SignatureLevelEnum.Bearer;
            break;
    }
    return signatureLevel;
};
exports.detectSignatureLevel = detectSignatureLevel;
const getSignatures = async (signatureLevel = SignatureLevelEnum.Bearer) => {
    let signatures = { access_signature: "", refresh_signature: "" };
    switch (signatureLevel) {
        case SignatureLevelEnum.System:
            signatures.access_signature = process.env.ACCESS_SYSTEM_TOKEN_SIGNATURE;
            signatures.refresh_signature = process.env.REFRESH_SYSTEM_TOKEN_SIGNATURE;
            break;
        default:
            signatures.access_signature = process.env.ACCESS_USER_TOKEN_SIGNATURE;
            signatures.refresh_signature = process.env.REFRESH_USER_TOKEN_SIGNATURE;
            break;
    }
    return signatures;
};
exports.getSignatures = getSignatures;
const createLoginCredentials = async (user) => {
    const signatureLevel = await (0, exports.detectSignatureLevel)(user.role);
    const signatures = await (0, exports.getSignatures)(signatureLevel);
    const jwtid = (0, uuid_1.v4)();
    const access_token = await (0, exports.generateToken)({
        payload: { _id: user._id },
        secret: signatures.access_signature,
        options: { expiresIn: Number(process.env.ACCESS_TOKEN_EXPIRES_IN), jwtid }
    });
    const refresh_token = await (0, exports.generateToken)({
        payload: { _id: user._id },
        secret: signatures.refresh_signature,
        options: { expiresIn: Number(process.env.REFRESH_TOKEN_EXPIRES_IN), jwtid }
    });
    return { access_token, refresh_token };
};
exports.createLoginCredentials = createLoginCredentials;
const decodeToken = async ({ authorization, tokenType = TokenEnum.access }) => {
    const userModel = new repository_1.UserRepository(user_model_1.UserModel);
    const tokenModel = new repository_1.TokenRepository(token_model_1.TokenModel);
    const [bearerKey, token] = authorization.split(" ");
    if (!bearerKey || !token) {
        throw new error_response_1.UnauthorizedException("missing token parts");
    }
    const signatures = await (0, exports.getSignatures)(bearerKey);
    const decoded = await (0, exports.verifyToken)({
        token,
        secret: tokenType === TokenEnum.refresh ? signatures.refresh_signature : signatures.access_signature
    });
    if (!decoded?._id || !decoded?.iat) {
        throw new error_response_1.BadRequestException("Invalid token payload");
    }
    if (await tokenModel.findOne({ filter: { jti: decoded.jti } })) {
        throw new error_response_1.UnauthorizedException("Invalid or old credentials");
    }
    const user = await userModel.findOne({ filter: { _id: decoded._id } });
    if (!user) {
        throw new error_response_1.BadRequestException("Not register account");
    }
    if ((user.changeCredentialsTime?.getTime() || 0) > decoded.iat * 1000) {
        throw new error_response_1.UnauthorizedException("Invalid or old credentials");
    }
    return { user, decoded };
};
exports.decodeToken = decodeToken;
const createRevokeToken = async (decoded) => {
    const tokenModel = new repository_1.TokenRepository(token_model_1.TokenModel);
    const [result] = (await tokenModel.create({
        data: [{
                jti: decoded.jti,
                expiresIn: decoded.iat + Number(process.env.REFRESH_TOKEN_EXPIRES_IN),
                userId: decoded._id,
            }]
    })) || [];
    if (!result) {
        throw new error_response_1.BadRequestException("Fail to revoke this token");
    }
    return result;
};
exports.createRevokeToken = createRevokeToken;
