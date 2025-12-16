const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const deviceTokenController = require('../../controllers/deviceTokenController');

/**
 * @swagger
 * tags:
 *   name: Devices
 *   description: Device token management for push notifications
 */

/**
 * @swagger
 * /api/v1/devices/register:
 *   post:
 *     summary: Register or update device token for push notifications
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - platform
 *             properties:
 *               token:
 *                 type: string
 *                 description: FCM device token
 *                 example: "fGhJkLmNoPqRsTuVwXyZ1234567890"
 *               platform:
 *                 type: string
 *                 enum: [ios, android, web]
 *                 example: "ios"
 *               deviceId:
 *                 type: string
 *                 description: Optional device identifier
 *                 example: "iPhone-12-Pro"
 *               appVersion:
 *                 type: string
 *                 description: Optional app version
 *                 example: "1.0.0"
 *     responses:
 *       200:
 *         description: Device token registered successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post(
  '/register',
  authenticate,
  deviceTokenController.registerDeviceTokenValidation,
  deviceTokenController.registerDeviceToken
);

/**
 * @swagger
 * /api/v1/devices:
 *   get:
 *     summary: Get user's registered device tokens
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of device tokens
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 devices:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       platform:
 *                         type: string
 *                       deviceId:
 *                         type: string
 *                       appVersion:
 *                         type: string
 *                       isActive:
 *                         type: boolean
 *                       createdAt:
 *                         type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/', authenticate, deviceTokenController.getDeviceTokens);

/**
 * @swagger
 * /api/v1/devices/{token}:
 *   delete:
 *     summary: Unregister device token
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Device token to unregister
 *     responses:
 *       200:
 *         description: Device token unregistered successfully
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete('/:token', authenticate, deviceTokenController.unregisterDeviceToken);

module.exports = router;



