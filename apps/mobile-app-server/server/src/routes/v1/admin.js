const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../../middleware/auth');
const { getPoolStats } = require('../../config/database-pools');

/**
 * Admin endpoint to get connection pool statistics
 * GET /api/v1/admin/pools
 */
router.get('/pools', authenticate, isAdmin, async (req, res) => {
  try {
    const stats = getPoolStats();
    res.json({
      success: true,
      pools: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get pool stats error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

module.exports = router;

