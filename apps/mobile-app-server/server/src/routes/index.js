const express = require('express');
const router = express.Router();

// Import v1 routes
const authRoutes = require('./v1/authRoutes');
const userRoutes = require('./v1/userRoutes');
const adminRoutes = require('./v1/admin');
const uploadRoutes = require('./v1/uploadRoutes');
const deviceRoutes = require('./v1/deviceRoutes');
const profileRoutes = require('./v1/profileRoutes');
const searchRoutes = require('./v1/searchRoutes');

// Mount v1 routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);
router.use('/upload', uploadRoutes);
router.use('/devices', deviceRoutes);
router.use('/profile', profileRoutes);
router.use('/search', searchRoutes);

module.exports = router;

