import express from "express";
import { validate } from "../middlewares/validate.middleware";
import { authenticate } from "../middlewares/authentication.middleware";
import {authorize} from '../middlewares/authorization.middleware'

import {
     // getAllUsersSchema,
     getUserByIdSchema,
     createUserSchema,
     updateUserSchema,
     deleteUserSchema,
     changePasswordSchema } from "../validations/user.validation";
import {
     getUserById,
     deleteUser,
     createUser,
     getAllUsers,
     updateUser,
     restoreUser,
     getUserMe,
     changeMyPassword } from "../controllers/user.controller";


const router = express.Router();
router.get('/', authenticate, authorize(['super_admin', 'admin']), getAllUsers); 
router.get('/me',authenticate,getUserMe)
router.patch('/me/password',authenticate,validate(changePasswordSchema),changeMyPassword)
router.get('/:id', authenticate, authorize(['super_admin']),validate(getUserByIdSchema),getUserById);//
router.post('/',authenticate,authorize(['super_admin']),validate(createUserSchema),createUser)//
router.put('/:id',authenticate,authorize(['super_admin']),validate(updateUserSchema),updateUser)
router.delete('/:id',authenticate,authorize(['super_admin']),validate(deleteUserSchema),deleteUser)//
router.patch('/:id/restore',authenticate,authorize(['super_admin']),validate(deleteUserSchema),restoreUser)

export default router;