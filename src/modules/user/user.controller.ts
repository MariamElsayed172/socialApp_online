import { Router } from "express"
import { authentication, authorization } from "../../middleware/authentication.middleware";
import userService from "./user.service";
import { validation } from "../../middleware/validation.middleware";
import * as validators from "./user.validation";
import { TokenEnum } from "../../utils/security/token.security";
import { cloudFileUpload, fileValidation, storageEnum } from "../../utils/multer/cloud.multer";
import { endpoint } from "./user.authorization";
import { chatRouter } from "../chat";
const router = Router();
router.use("/:userId/chat", chatRouter)

router.get("/", authentication(), userService.profile)
router.get("/dashboard", authorization(endpoint.dashboard), userService.dashboard)
router.post("/:userId/send-friend-request", authentication(), validation(validators.sendFriendRequest), userService.sendFriendRequest)
router.patch("/accept-friend-request/:requestId", authentication(), validation(validators.acceptFriendRequest), userService.acceptFriendRequest)
router.patch("/:userId/change-role", authorization(endpoint.changeRole), validation(validators.changeRole), userService.changeRole)

router.patch(
    "/profile-image",
    authentication(),

    userService.profileImage
)
router.patch(
    "/profile-cover-image",
    authentication(),
    cloudFileUpload({
        validation: fileValidation.image,
        storageApproach: storageEnum.disk
    }).array("images",2),
    userService.profileCoverImage
)
router.delete("{/:userId}/freeze-account", authentication(),validation(validators.freezeAccount), userService.freezeAccount)
router.delete("/:userId", authorization(endpoint.hardDelete),validation(validators.hardDelete), userService.hardDeleteAccount)
router.patch("/:userId/restore-account", authorization(endpoint.restoreAccount),validation(validators.restoreAccount), userService.restoreAccount)
router.post("/refresh-token", authentication(TokenEnum.refresh), userService.refreshToken)
router.post("/logout", authentication(), validation(validators.logout), userService.logout)
export default router