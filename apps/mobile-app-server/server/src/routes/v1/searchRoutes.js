const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../../middleware/auth');
const searchController = require('../../controllers/searchController');

/**
 * @swagger
 * tags:
 *   name: Search
 *   description: Search functionality endpoints
 */

/**
 * @swagger
 * /api/v1/search/users:
 *   get:
 *     summary: Search users (Admin only)
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query (searches name and email)
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, admin]
 *         description: Filter by role
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter by active status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *         description: Results per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [name, email, createdAt, updatedAt]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserResponse'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationResponse'
 *                 query:
 *                   type: object
 *                   properties:
 *                     search:
 *                       type: string
 *                       nullable: true
 *                     role:
 *                       type: string
 *                       nullable: true
 *                     isActive:
 *                       type: boolean
 *                       nullable: true
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/users',
  authenticate,
  isAdmin,
  searchController.searchUsersValidation,
  searchController.searchUsers
);

module.exports = router;




