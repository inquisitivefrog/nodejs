/**
 * Upload Middleware Unit Tests
 * Tests for file upload middleware and utilities
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { upload, uploadProfilePicture, processImage, deleteFile, getFileUrl } = require('../../../src/middleware/upload');

// Mock sharp
jest.mock('sharp', () => {
  const fs = require('fs');
  const path = require('path');
  return jest.fn(() => ({
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toFile: jest.fn().mockImplementation((outputPath) => {
      // Create the output file so rename works in the actual code
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(outputPath, 'processed image data');
      return Promise.resolve({});
    }),
  }));
});

describe('Upload Middleware', () => {
  const testFilePath = path.join(__dirname, '../../../uploads/profile-pictures/test-file.jpg');

  beforeEach(() => {
    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, '../../../uploads/profile-pictures');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  describe('uploadProfilePicture', () => {
    it('should be a multer middleware function', () => {
      expect(uploadProfilePicture).toBeDefined();
      expect(typeof uploadProfilePicture).toBe('function');
    });
  });

  describe('processImage', () => {
    it('should process image with default options', async () => {
      // Create a test file with .jpg extension
      const jpgPath = path.join(__dirname, '../../../uploads/profile-pictures/test-original.jpg');
      // Ensure directory exists
      const dir = path.dirname(jpgPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(jpgPath, 'test image data');

      // The mock should create the processed file
      const result = await processImage(jpgPath);

      expect(result).toBe(jpgPath);
      
      // Cleanup
      if (fs.existsSync(jpgPath)) {
        fs.unlinkSync(jpgPath);
      }
      // Cleanup processed file if it exists
      const processedPath = jpgPath.replace(path.extname(jpgPath), '-processed.jpeg');
      if (fs.existsSync(processedPath)) {
        fs.unlinkSync(processedPath);
      }
    });

    it('should process image with custom options', async () => {
      const jpgPath = path.join(__dirname, '../../../uploads/profile-pictures/test-original2.jpg');
      // Ensure directory exists
      const dir = path.dirname(jpgPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(jpgPath, 'test image data');

      // The mock should create the processed file
      const result = await processImage(jpgPath, {
        width: 200,
        height: 200,
        quality: 90,
        format: 'jpeg',
      });

      expect(result).toBe(jpgPath);
      
      // Cleanup
      if (fs.existsSync(jpgPath)) {
        fs.unlinkSync(jpgPath);
      }
      // Cleanup processed file if it exists
      const processedPath = jpgPath.replace(path.extname(jpgPath), '-processed.jpeg');
      if (fs.existsSync(processedPath)) {
        fs.unlinkSync(processedPath);
      }
    });

    it('should throw error for non-existent file', async () => {
      const nonExistentPath = path.join(__dirname, '../../../uploads/profile-pictures/non-existent.jpg');

      await expect(processImage(nonExistentPath)).rejects.toThrow();
    });
  });

  describe('deleteFile', () => {
    it('should delete existing file', () => {
      fs.writeFileSync(testFilePath, 'test data');

      const result = deleteFile(testFilePath);

      expect(result).toBe(true);
      expect(fs.existsSync(testFilePath)).toBe(false);
    });

    it('should return false for non-existent file', () => {
      const nonExistentPath = path.join(__dirname, '../../../uploads/profile-pictures/non-existent.jpg');

      const result = deleteFile(nonExistentPath);

      expect(result).toBe(false);
    });
  });

  describe('getFileUrl', () => {
    it('should return relative URL for file path', () => {
      // Use a path that doesn't include the full __dirname structure
      const filePath = path.join(__dirname, '../../uploads/profile-pictures/test.jpg');
      const url = getFileUrl(filePath);

      expect(url).toMatch(/^\/uploads\//);
    });

    it('should return null for null input', () => {
      const url = getFileUrl(null);

      expect(url).toBeNull();
    });

    it('should return URL as-is if already a URL', () => {
      const httpUrl = 'http://example.com/image.jpg';
      const url = getFileUrl(httpUrl);

      expect(url).toBe(httpUrl);
    });

    it('should return URL as-is if already an HTTPS URL', () => {
      const httpsUrl = 'https://example.com/image.jpg';
      const url = getFileUrl(httpsUrl);

      expect(url).toBe(httpsUrl);
    });
  });
});

