import { Router } from "express";
import { validation } from '../../middleware/validation.middleware';
import authService from './auth.service';
import * as validators from './auth.validation';
const router: Router = Router();

router.post(
    "/signup",
    validation(validators.signup),
    authService.signup)
router.post(
    "/signup-gmail",
    validation(validators.signupWithGmail),
    authService.signupWithGmail)
router.post(
    "/login-gmail",
    validation(validators.signupWithGmail),
    authService.loginWithGmail)
router.post("/login",validation(validators.login) , authService.login)
router.patch("/send-forgot-password",validation(validators.sendForgetPasswordCode) , authService.sendForgetCode)
router.patch("/verify-forgot-password",validation(validators.verifyForgetPasswordCode) , authService.verifyForgetCode)
router.patch("/reset-forgot-password",validation(validators.resetForgetPasswordCode) , authService.resetForgetCode)
router.patch("/confirm-email",validation(validators.confirmEmail) , authService.confirmEmail)
export default router;