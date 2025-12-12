/**
 * Upload Controller
 * Handles file upload operations
 */

const path = require('path');
const { getWriteUserModel } = require('../utils/db-helper');
const { processImage, deleteFile, getFileUrl } = require('../middleware/upload');
const logger = require('../config/logger');

/**
 * Upload profile picture
 * POST /api/v1/upload/profile-picture
 */
const uploadProfilePicture = async (req, res) => {
  try {
    // Handle multer errors (file type, size, etc.)
    if (req.fileValidationError) {
      return res.status(400).json({ message: req.fileValidationError });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const userId = req.user.id;
    const filePath = req.file.path;

    // Process and optimize the image
    await processImage(filePath, {
      width: 400,
      height: 400,
      quality: 80,
      format: 'jpeg',
    });

    // Get file URL
    const fileUrl = getFileUrl(filePath);

    // Update user profile picture
    const WriteUser = await getWriteUserModel();
    const user = await WriteUser.findById(userId);

    if (!user) {
      // Delete uploaded file if user not found
      deleteFile(filePath);
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete old profile picture if exists
    if (user.profilePicture) {
      const oldFilePath = user.profilePicture.replace('/uploads/', '');
      deleteFile(path.join(__dirname, '../../uploads', oldFilePath));
    }

    // Update user with new profile picture URL
    user.profilePicture = fileUrl;
    await user.save();

    logger.info('Profile picture uploaded', {
      userId,
      fileUrl,
      fileSize: req.file.size,
    });

    res.json({
      message: 'Profile picture uploaded successfully',
      profilePicture: fileUrl,
    });
  } catch (error) {
    logger.error('Profile picture upload failed', {
      userId: req.user?.id,
      error: error.message,
    });

    // Delete uploaded file on error
    if (req.file && req.file.path) {
      deleteFile(req.file.path);
    }

    res.status(500).json({
      message: 'Failed to upload profile picture',
      error: error.message,
    });
  }
};

/**
 * Delete profile picture
 * DELETE /api/v1/upload/profile-picture
 */
const deleteProfilePicture = async (req, res) => {
  try {
    const userId = req.user.id;

    const WriteUser = await getWriteUserModel();
    const user = await WriteUser.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.profilePicture) {
      return res.status(400).json({ message: 'No profile picture to delete' });
    }

    // Delete file from filesystem
    const filePath = user.profilePicture.replace('/uploads/', '');
    deleteFile(path.join(__dirname, '../../uploads', filePath));

    // Remove profile picture from user
    user.profilePicture = null;
    await user.save();

    logger.info('Profile picture deleted', { userId });

    res.json({ message: 'Profile picture deleted successfully' });
  } catch (error) {
    logger.error('Profile picture deletion failed', {
      userId: req.user?.id,
      error: error.message,
    });

    res.status(500).json({
      message: 'Failed to delete profile picture',
      error: error.message,
    });
  }
};

module.exports = {
  uploadProfilePicture,
  deleteProfilePicture,
};

