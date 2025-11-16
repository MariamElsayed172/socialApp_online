"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const post_service_1 = require("./post.service");
const validators = __importStar(require("./post.validation"));
const express_1 = require("express");
const authentication_middleware_1 = require("../../middleware/authentication.middleware");
const cloud_multer_1 = require("../../utils/multer/cloud.multer");
const validation_middleware_1 = require("../../middleware/validation.middleware");
const comment_1 = require("../comment");
const router = (0, express_1.Router)();
router.use("/:postId/comment", comment_1.commentRouter);
router.post("/", (0, authentication_middleware_1.authentication)(), (0, cloud_multer_1.cloudFileUpload)({ validation: cloud_multer_1.fileValidation.image }).array("attachments", 2), (0, validation_middleware_1.validation)(validators.createPost), post_service_1.postService.createPost);
router.get("/", (0, authentication_middleware_1.authentication)(), post_service_1.postService.postList);
router.patch("/:postId", (0, authentication_middleware_1.authentication)(), (0, cloud_multer_1.cloudFileUpload)({ validation: cloud_multer_1.fileValidation.image }).array("attachments", 2), (0, validation_middleware_1.validation)(validators.updatePost), post_service_1.postService.updatePost);
router.patch("/:postId/like", (0, authentication_middleware_1.authentication)(), (0, validation_middleware_1.validation)(validators.likePost), post_service_1.postService.likePost);
exports.default = router;
