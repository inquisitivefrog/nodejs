const sanitizeInput = require('../../../src/middleware/sanitize');

describe('Input Sanitization Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      query: {},
      params: {},
    };
    res = {};
    next = jest.fn();
  });

  describe('String Sanitization', () => {
    it('should remove HTML tags from strings', () => {
      req.body.name = '<script>alert("xss")</script>Test';
      sanitizeInput(req, res, next);
      
      expect(req.body.name).not.toContain('<script>');
      expect(req.body.name).not.toContain('</script>');
      expect(next).toHaveBeenCalled();
    });

    it('should remove JavaScript protocol', () => {
      req.body.url = 'javascript:alert("xss")';
      sanitizeInput(req, res, next);
      
      expect(req.body.url).not.toContain('javascript:');
      expect(next).toHaveBeenCalled();
    });

    it('should remove event handlers', () => {
      req.body.name = 'Test<img src=x onerror=alert(1)>';
      sanitizeInput(req, res, next);
      
      expect(req.body.name).not.toContain('onerror=');
      expect(next).toHaveBeenCalled();
    });

    it('should trim whitespace', () => {
      req.body.name = '  Test User  ';
      sanitizeInput(req, res, next);
      
      expect(req.body.name).toBe('Test User');
      expect(next).toHaveBeenCalled();
    });

    it('should limit string length', () => {
      req.body.name = 'a'.repeat(20000);
      sanitizeInput(req, res, next);
      
      expect(req.body.name.length).toBeLessThanOrEqual(10000);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Object Sanitization', () => {
    it('should sanitize nested objects', () => {
      req.body = {
        user: {
          name: '<script>alert("xss")</script>',
          email: 'test@example.com',
        },
      };
      sanitizeInput(req, res, next);
      
      expect(req.body.user.name).not.toContain('<script>');
      expect(req.body.user.email).toBe('test@example.com');
      expect(next).toHaveBeenCalled();
    });

    it('should sanitize arrays', () => {
      req.body.tags = ['<script>tag1</script>', 'tag2', '<img src=x onerror=alert(1)>'];
      sanitizeInput(req, res, next);
      
      expect(req.body.tags[0]).not.toContain('<script>');
      expect(req.body.tags[2]).not.toContain('onerror=');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Query Parameter Sanitization', () => {
    it('should sanitize query parameters', () => {
      req.query.search = '<script>alert("xss")</script>';
      sanitizeInput(req, res, next);
      
      expect(req.query.search).not.toContain('<script>');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Route Parameter Sanitization', () => {
    it('should sanitize route parameters', () => {
      req.params.id = '<script>alert("xss")</script>';
      sanitizeInput(req, res, next);
      
      expect(req.params.id).not.toContain('<script>');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values', () => {
      req.body.value = null;
      sanitizeInput(req, res, next);
      
      expect(req.body.value).toBeNull();
      expect(next).toHaveBeenCalled();
    });

    it('should handle undefined values', () => {
      req.body.value = undefined;
      sanitizeInput(req, res, next);
      
      expect(req.body.value).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should handle non-string values', () => {
      req.body.number = 123;
      req.body.boolean = true;
      sanitizeInput(req, res, next);
      
      expect(req.body.number).toBe(123);
      expect(req.body.boolean).toBe(true);
      expect(next).toHaveBeenCalled();
    });

    it('should handle empty objects', () => {
      req.body = {};
      sanitizeInput(req, res, next);
      
      expect(req.body).toEqual({});
      expect(next).toHaveBeenCalled();
    });
  });
});

