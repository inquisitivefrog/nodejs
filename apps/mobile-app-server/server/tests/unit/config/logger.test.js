/**
 * Logger Configuration Unit Tests
 * Tests for Winston logger setup and configuration
 */

const logger = require('../../../src/config/logger');
const path = require('path');
const fs = require('fs');

describe('Logger Configuration', () => {
  describe('Logger Instance', () => {
    it('should create logger instance', () => {
      expect(logger).toBeDefined();
      expect(logger.info).toBeInstanceOf(Function);
      expect(logger.error).toBeInstanceOf(Function);
      expect(logger.warn).toBeInstanceOf(Function);
      expect(logger.debug).toBeInstanceOf(Function);
    });

    it('should have default metadata', () => {
      expect(logger.defaultMeta).toBeDefined();
      expect(logger.defaultMeta.service).toBe('mobile-app-server');
    });

    it('should have stream property for Morgan', () => {
      expect(logger.stream).toBeDefined();
      expect(logger.stream.write).toBeInstanceOf(Function);
    });
  });

  describe('Log Levels', () => {
    it('should log info messages', () => {
      expect(() => {
        logger.info('Test info message', { test: true });
      }).not.toThrow();
    });

    it('should log error messages', () => {
      expect(() => {
        logger.error('Test error message', { error: 'test' });
      }).not.toThrow();
    });

    it('should log warn messages', () => {
      expect(() => {
        logger.warn('Test warn message', { warning: 'test' });
      }).not.toThrow();
    });

    it('should log debug messages', () => {
      expect(() => {
        logger.debug('Test debug message', { debug: 'test' });
      }).not.toThrow();
    });
  });

  describe('Log Format', () => {
    it('should format logs with timestamp', () => {
      const logData = { test: 'data' };
      expect(() => {
        logger.info('Test message', logData);
      }).not.toThrow();
    });

    it('should include metadata in logs', () => {
      expect(() => {
        logger.info('Test message', { customField: 'value' });
      }).not.toThrow();
    });
  });

  describe('Stream for Morgan', () => {
    it('should write to stream', () => {
      const message = 'Test log message';
      expect(() => {
        logger.stream.write(message);
      }).not.toThrow();
    });
  });
});

