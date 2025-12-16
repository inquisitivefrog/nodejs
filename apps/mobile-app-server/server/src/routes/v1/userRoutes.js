const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../../middleware/auth');
const { cache, invalidateCache } = require('../../middleware/cache');
const AnalyticsService = require('../../services/analytics.service');
const NotificationService = require('../../services/notification.service');
const { getReadUserModel, getWriteUserModel } = require('../../utils/db-helper');

/**
 * Parse pagination parameters from query string
 */
function parsePagination(req) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10)); // Max 100 items per page
  const skip = (page - 1) * limit;
  
  // Parse sort field and order
  const sortField = req.query.sort || 'createdAt';
  const sortOrder = req.query.order === 'asc' ? 1 : -1;
  const sort = { [sortField]: sortOrder };
  
  return { page, limit, skip, sort };
}

/**
 * Parse filter parameters from query string
 */
function parseFilters(req) {
  const filters = {};
  
  // Filter by role
  if (req.query.role) {
    filters.role = req.query.role;
  }
  
  // Filter by active status
  if (req.query.isActive !== undefined) {
    filters.isActive = req.query.isActive === 'true';
  }
  
  // Filter by email (partial match)
  if (req.query.email) {
    filters.email = { $regex: req.query.email, $options: 'i' }; // Case-insensitive
  }
  
  // Filter by name (partial match)
  if (req.query.name) {
    filters.name = { $regex: req.query.name, $options: 'i' }; // Case-insensitive
  }
  
  return filters;
}

// Cache key generators
const userListCacheKey = (req) => {
  // Include pagination and filter params in cache key
  const params = new URLSearchParams({
    page: req.query.page || '1',
    limit: req.query.limit || '10',
    sort: req.query.sort || 'createdAt',
    order: req.query.order || 'desc',
    ...(req.query.role && { role: req.query.role }),
    ...(req.query.isActive !== undefined && { isActive: req.query.isActive }),
    ...(req.query.email && { email: req.query.email }),
    ...(req.query.name && { name: req.query.name }),
  });
  return `cache:/api/v1/users?${params.toString()}`;
};
const userByIdCacheKey = (req) => `cache:/api/v1/users/${req.params.id}`;

// Get all users (Admin only) - with pagination, filtering, and sorting
router.get('/', authenticate, isAdmin, cache(300, userListCacheKey), async (req, res) => {
  try {
    const { page, limit, skip, sort } = parsePagination(req);
    const filters = parseFilters(req);
    
    // Use read pool for listing users (read operation - can use secondary)
    const ReadUser = await getReadUserModel();
    
    // Get total count for pagination metadata
    const total = await ReadUser.countDocuments(filters);
    
    // Get paginated users
    const users = await ReadUser.find(filters)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(); // Use lean() for better performance with caching
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user by ID (Admin only) - cached for 5 minutes
router.get('/:id', authenticate, isAdmin, cache(300, userByIdCacheKey), async (req, res) => {
  try {
    // Use read pool for getting user by ID (read operation - can use secondary)
    const ReadUser = await getReadUserModel();
    const user = await ReadUser.findById(req.params.id)
      .select('-password')
      .lean(); // Use lean() for better performance with caching
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user (Admin only)
router.put('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { name, email, role, isActive } = req.body;
    
    // Use write pool for update operations (write operation - must use primary)
    const WriteUser = await getWriteUserModel();
    const user = await WriteUser.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields if provided
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    // Invalidate cache for this user and user list (all pagination variations)
    await invalidateCache(`cache:/api/v1/users/${req.params.id}`);
    await invalidateCache('cache:/api/v1/users*'); // Invalidate all paginated user lists

    // Log admin action asynchronously
    AnalyticsService.logUserAction(req.user.id, 'user.updated', {
      targetUserId: req.params.id,
      changes: { name, email, role, isActive },
    }).catch((err) => {
      console.error('Failed to enqueue analytics event:', err.message);
    });

    // Send notification if account was deactivated
    if (isActive === false && user.isActive !== false) {
      NotificationService.sendAccountActivityNotification(
        req.params.id,
        'deactivated'
      ).catch((err) => {
        console.error('Failed to enqueue notification:', err.message);
      });
    }

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({ user: userResponse });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete user (Admin only)
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    // Use write pool for delete operations (write operation - must use primary)
    const WriteUser = await getWriteUserModel();
    const user = await WriteUser.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await WriteUser.findByIdAndDelete(req.params.id);

    // Invalidate cache for this user and user list (all pagination variations)
    await invalidateCache(`cache:/api/v1/users/${req.params.id}`);
    await invalidateCache('cache:/api/v1/users*'); // Invalidate all paginated user lists

    // Log admin action asynchronously
    AnalyticsService.logUserAction(req.user.id, 'user.deleted', {
      deletedUserId: req.params.id,
    }).catch((err) => {
      console.error('Failed to enqueue analytics event:', err.message);
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

