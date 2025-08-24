import { Router } from "express";
import { validation } from '../../middleware/validation.middleware';
import authService from './auth.service';
import * as validators from './auth.validation';
const router: Router = Router();

router.post(
    "/signup",
    validation(validators.signup),
    authService.signup)
router.post("/login",validation(validators.login) , authService.login)
router.patch("/confirm-email",validation(validators.confirmEmail) , authService.confirmEmail)
export default router;