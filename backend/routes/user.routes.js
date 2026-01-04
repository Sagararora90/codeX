import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { body } from 'express-validator';
import * as authMiddleware from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.middleware.js';

const router = Router();

router.post('/register',
    body('email').isEmail().withMessage('Email must be a valid email address'),
    body('username').isString().isLength({ min: 3 }).withMessage('Username must be at least 3 characters long'),
    body('password').isLength({ min: 3 }).withMessage('Password must be at least 3 characters long'),
    userController.createUserController);

router.post('/login',
    body('email').isEmail().withMessage('Email must be a valid email address'),
    body('password').isLength({ min: 3 }).withMessage('Password must be at least 3 characters long'),
    userController.loginController);

router.get('/profile', authMiddleware.authUser, userController.profileController);

router.get('/logout', authMiddleware.authUser, userController.logoutController);

router.get('/all', authMiddleware.authUser, userController.getAllUsersController);

router.get('/search', authMiddleware.authUser, userController.searchUserController);

router.put('/update-username', authMiddleware.authUser, userController.updateUsernameController);

router.post('/invitations/send', authMiddleware.authUser, userController.sendInvitationController);

router.get('/invitations/get', authMiddleware.authUser, userController.getInvitationsController);

router.post('/invitations/accept', authMiddleware.authUser, userController.acceptInvitationController);

router.post('/upload-image', 
    authMiddleware.authUser, 
    upload.single('image'), 
    userController.uploadProfileImageController
);

export default router;
