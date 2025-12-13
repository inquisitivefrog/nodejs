const { query, validationResult } = require('express-validator');
const { getReadUserModel } = require('../utils/db-helper');
const logger = require('../config/logger');

/**
 * Search users
 * GET /api/v1/search/users
 */
exports.searchUsers = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { q, role, isActive, page = 1, limit = 10, sort = 'createdAt', order = 'desc' } = req.query;
    const ReadUser = await getReadUserModel();

    // Build search query
    const searchQuery = {};

    // Text search
    if (q) {
      searchQuery.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ];
    }

    // Filters
    if (role) {
      searchQuery.role = role;
    }
    if (isActive !== undefined) {
      searchQuery.isActive = isActive === 'true';
    }

    // Pagination
    const pageNum = parseInt(page) || 1;
    let limitNum = parseInt(limit) || 10;
    limitNum = Math.min(limitNum, 100); // Max 100 per page
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortObj = { [sort]: sortOrder };

    // Execute query
    const [users, total] = await Promise.all([
      ReadUser.find(searchQuery)
        .select('-password -refreshToken -refreshTokenExpires -passwordResetToken -passwordResetExpires -emailVerificationToken -emailVerificationExpires')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ReadUser.countDocuments(searchQuery),
    ]);

    res.json({
      users,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasNextPage: pageNum * limitNum < total,
        hasPrevPage: pageNum > 1,
      },
      query: {
        search: q || null,
        role: role || null,
        isActive: isActive !== undefined ? isActive === 'true' : null,
      },
    });
  } catch (error) {
    logger.error('Error searching users:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Validation rules for user search
 */
exports.searchUsersValidation = [
  query('q').optional().trim().isLength({ min: 1 }).withMessage('Search query must not be empty'),
  query('role').optional().isIn(['user', 'admin']).withMessage('Role must be user or admin'),
  query('isActive').optional().isIn(['true', 'false']).withMessage('isActive must be true or false'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1 }).withMessage('Limit must be a positive integer (max 100 enforced)'),
  query('sort').optional().isIn(['name', 'email', 'createdAt', 'updatedAt']).withMessage('Invalid sort field'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc'),
];

