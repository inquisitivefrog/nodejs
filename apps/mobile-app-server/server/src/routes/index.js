const express = require('express');
const router = express.Router();

// Import v1 routes
const authRoutes = require('./v1/authRoutes');
const userRoutes = require('./v1/userRoutes');
const adminRoutes = require('./v1/admin');

// Mount v1 routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);

module.exports = router;

