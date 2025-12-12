const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/auth');
const { cache, invalidateCache } = require('../middleware/cache');
const AnalyticsService = require('../services/analytics.service');
const NotificationService = require('../services/notification.service');
const { getReadUserModel, getWriteUserModel } = require('../utils/db-helper');

// Cache key generators
const userListCacheKey = (req) => `cache:/api/users`;
const userByIdCacheKey = (req) => `cache:/api/users/${req.params.id}`;

// Get all users (Admin only) - cached for 5 minutes
router.get('/', authenticate, isAdmin, cache(300, userListCacheKey), async (req, res) => {
  try {
    // Use read pool for listing users (read operation - can use secondary)
    const ReadUser = await getReadUserModel();
    const users = await ReadUser.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .lean(); // Use lean() for better performance with caching
    
    res.json({ users });
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

    // Invalidate cache for this user and user list
    await invalidateCache(`cache:/api/users/${req.params.id}`);
    await invalidateCache('cache:/api/users');

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

    // Invalidate cache for this user and user list
    await invalidateCache(`cache:/api/users/${req.params.id}`);
    await invalidateCache('cache:/api/users');

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


