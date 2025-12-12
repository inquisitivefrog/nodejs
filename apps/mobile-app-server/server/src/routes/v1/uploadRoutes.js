/**
 * Upload Routes
 * File upload endpoints
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const { uploadProfilePicture: uploadMiddleware } = require('../../middleware/upload');
const uploadController = require('../../controllers/uploadController');

/**
 * @swagger
 * /api/v1/upload/profile-picture:
 *   post:
 *     summary: Upload profile picture
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *                 description: Profile picture image file (JPEG, PNG, GIF, WebP, max 5MB)
 *     responses:
 *       200:
 *         description: Profile picture uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 profilePicture:
 *                   type: string
 *       400:
 *         description: No file uploaded or invalid file type
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
const { handleMulterError } = require('../../middleware/upload');

router.post(
  '/profile-picture',
  authenticate,
  uploadMiddleware,
  handleMulterError,
  uploadController.uploadProfilePicture
);

/**
 * @swagger
 * /api/v1/upload/profile-picture:
 *   delete:
 *     summary: Delete profile picture
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile picture deleted successfully
 *       400:
 *         description: No profile picture to delete
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.delete(
  '/profile-picture',
  authenticate,
  uploadController.deleteProfilePicture
);

module.exports = router;

