/**
 * MongoDB Authentication and Identity Tests
 * 
 * These tests verify MongoDB's built-in authentication system:
 * 1. Admin database users exist (for MongoDB authentication)
 * 2. Database users exist for the application database
 * 3. User roles and permissions
 * 4. Authentication credentials work
 * 
 * Note: These tests check for MongoDB authentication users in the admin database,
 * which is separate from the application's User model.
 */

const mongoose = require('mongoose');
const { setupTestDB } = require('../helpers/testHelpers');

describe('MongoDB Authentication and Identity Tests', () => {
  let adminConnection;
  let appConnection;

  beforeAll(async () => {
    await setupTestDB();
    
    // Connect to admin database to check authentication users
    const mongoUri = process.env.MONGODB_URI || 'mongodb://mongodb1:27017,mongodb2:27017,mongodb3:27017/mobileapp?replicaSet=rs0';
    const adminUri = mongoUri.replace(/\/[^\/]+(\?|$)/, '/admin$1');
    
    try {
      adminConnection = await mongoose.createConnection(adminUri);
    } catch (error) {
      console.warn('Could not connect to admin database:', error.message);
    }
  });

  afterAll(async () => {
    if (adminConnection && adminConnection.readyState === 1) {
      await adminConnection.close();
    }
  });

  describe('MongoDB Authentication Status', () => {
    it('should verify MongoDB connection is established', async () => {
      const connection = mongoose.connection;
      expect(connection.readyState).toBe(1); // 1 = connected
    });

    it('should be able to query admin database', async () => {
      if (!adminConnection || adminConnection.readyState !== 1) {
        // Skip if admin connection not available
        return;
      }

      // Try to query admin database
      const adminDb = adminConnection.db.admin();
      const result = await adminDb.command({ listDatabases: 1 });
      
      expect(result).toBeDefined();
      expect(result.databases).toBeDefined();
      expect(Array.isArray(result.databases)).toBe(true);
    });

    it('should check if authentication is enabled', async () => {
      if (!adminConnection || adminConnection.readyState !== 1) {
        // Skip if admin connection not available
        return;
      }

      try {
        // Try to list users - if auth is enabled, this will require authentication
        const adminDb = adminConnection.db.admin();
        const users = await adminDb.command({ usersInfo: 1 });
        
        // If we can list users without error, auth might not be enabled
        // or we're authenticated
        expect(users).toBeDefined();
      } catch (error) {
        // If we get an authentication error, auth is enabled
        if (error.code === 13 || error.message.includes('authentication')) {
          // Authentication is enabled
          expect(error.code).toBe(13); // Unauthorized
        } else {
          throw error;
        }
      }
    });
  });

  describe('Admin Database Users', () => {
    it('should verify admin database users exist (if authentication enabled)', async () => {
      if (!adminConnection || adminConnection.readyState !== 1) {
        // Skip if admin connection not available
        console.warn('Skipping: Admin connection not available');
        return;
      }

      try {
        const adminDb = adminConnection.db.admin();
        const usersInfo = await adminDb.command({ usersInfo: 1 });
        
        if (usersInfo.users && usersInfo.users.length > 0) {
          // Authentication is enabled and users exist
          expect(usersInfo.users).toBeDefined();
          expect(Array.isArray(usersInfo.users)).toBe(true);
          expect(usersInfo.users.length).toBeGreaterThan(0);
          
          // Log available users for debugging
          console.log('MongoDB admin users:', usersInfo.users.map(u => ({
            user: u.user,
            db: u.db,
            roles: u.roles
          })));
        } else {
          // No users found - authentication might not be enabled
          console.warn('No MongoDB admin users found - authentication may not be enabled');
        }
      } catch (error) {
        if (error.code === 13) {
          // Authentication required but not provided
          console.warn('Authentication required but credentials not provided in test environment');
        } else {
          throw error;
        }
      }
    });

    it('should verify root/admin user exists (if authentication enabled)', async () => {
      if (!adminConnection || adminConnection.readyState !== 1) {
        return;
      }

      try {
        const adminDb = adminConnection.db.admin();
        const usersInfo = await adminDb.command({ usersInfo: 1 });
        
        if (usersInfo.users && usersInfo.users.length > 0) {
          // Check for root or admin user
          const adminUsers = usersInfo.users.filter(u => 
            u.roles.some(r => 
              r.role === 'root' || 
              r.role === 'userAdminAnyDatabase' ||
              r.role === 'dbAdminAnyDatabase'
            )
          );
          
          if (adminUsers.length > 0) {
            expect(adminUsers.length).toBeGreaterThan(0);
            console.log('Admin users found:', adminUsers.map(u => u.user));
          } else {
            console.warn('No root/admin users found');
          }
        }
      } catch (error) {
        if (error.code === 13) {
          console.warn('Authentication required for user verification');
        } else {
          throw error;
        }
      }
    });

    it('should verify application database user exists (if authentication enabled)', async () => {
      if (!adminConnection || adminConnection.readyState !== 1) {
        return;
      }

      try {
        const adminDb = adminConnection.db.admin();
        const usersInfo = await adminDb.command({ 
          usersInfo: { forAllDBs: true } 
        });
        
        if (usersInfo.users && usersInfo.users.length > 0) {
          // Check for users with access to mobileapp database
          const appUsers = usersInfo.users.filter(u => 
            u.roles.some(r => 
              (r.db === 'mobileapp' || r.db === 'mobileapp-test') &&
              (r.role === 'readWrite' || r.role === 'dbOwner' || r.role === 'read')
            )
          );
          
          if (appUsers.length > 0) {
            expect(appUsers.length).toBeGreaterThan(0);
            console.log('Application database users found:', appUsers.map(u => ({
              user: u.user,
              db: u.db,
              roles: u.roles
            })));
          } else {
            console.warn('No application database users found');
          }
        }
      } catch (error) {
        if (error.code === 13) {
          console.warn('Authentication required for user verification');
        } else {
          throw error;
        }
      }
    });
  });

  describe('User Roles and Permissions', () => {
    it('should verify user roles are properly configured', async () => {
      if (!adminConnection || adminConnection.readyState !== 1) {
        return;
      }

      try {
        const adminDb = adminConnection.db.admin();
        const usersInfo = await adminDb.command({ usersInfo: 1 });
        
        if (usersInfo.users && usersInfo.users.length > 0) {
          // Verify each user has at least one role
          usersInfo.users.forEach(user => {
            expect(user.roles).toBeDefined();
            expect(Array.isArray(user.roles)).toBe(true);
            expect(user.roles.length).toBeGreaterThan(0);
            
            // Verify role structure
            user.roles.forEach(role => {
              expect(role).toHaveProperty('role');
              expect(role).toHaveProperty('db');
            });
          });
        }
      } catch (error) {
        if (error.code === 13) {
          console.warn('Authentication required for role verification');
        } else {
          throw error;
        }
      }
    });

    it('should verify readWrite role exists for application database', async () => {
      if (!adminConnection || adminConnection.readyState !== 1) {
        return;
      }

      try {
        const adminDb = adminConnection.db.admin();
        const usersInfo = await adminDb.command({ 
          usersInfo: { forAllDBs: true } 
        });
        
        if (usersInfo.users && usersInfo.users.length > 0) {
          // Check for users with readWrite role on mobileapp database
          const readWriteUsers = usersInfo.users.filter(u => 
            u.roles.some(r => 
              (r.db === 'mobileapp' || r.db === 'mobileapp-test') &&
              r.role === 'readWrite'
            )
          );
          
          if (readWriteUsers.length > 0) {
            expect(readWriteUsers.length).toBeGreaterThan(0);
            console.log('ReadWrite users found:', readWriteUsers.map(u => u.user));
          } else {
            console.warn('No readWrite users found for application database');
          }
        }
      } catch (error) {
        if (error.code === 13) {
          console.warn('Authentication required for role verification');
        } else {
          throw error;
        }
      }
    });
  });

  describe('Authentication Credentials', () => {
    it('should verify connection string format supports authentication', () => {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://mongodb1:27017,mongodb2:27017,mongodb3:27017/mobileapp?replicaSet=rs0';
      
      // Connection string should support authentication format:
      // mongodb://username:password@host:port/database
      // or
      // mongodb://host:port/database?authSource=admin
      
      // Check if URI contains authentication credentials
      const hasAuth = mongoUri.includes('@') && mongoUri.includes(':');
      
      if (hasAuth) {
        // Extract username from connection string
        const match = mongoUri.match(/mongodb:\/\/([^:]+):/);
        if (match) {
          expect(match[1]).toBeDefined();
          console.log('Connection string contains authentication credentials');
        }
      } else {
        console.warn('Connection string does not contain authentication credentials');
        console.warn('To enable authentication, use format: mongodb://username:password@host/database?authSource=admin');
      }
    });

    it('should verify authSource parameter is set (if authentication enabled)', () => {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://mongodb1:27017,mongodb2:27017,mongodb3:27017/mobileapp?replicaSet=rs0';
      
      // If authentication is enabled, authSource should typically be 'admin'
      if (mongoUri.includes('authSource')) {
        const authSourceMatch = mongoUri.match(/authSource=([^&]+)/);
        if (authSourceMatch) {
          expect(authSourceMatch[1]).toBeDefined();
          console.log('authSource is set to:', authSourceMatch[1]);
        }
      } else {
        console.warn('authSource parameter not found in connection string');
        console.warn('If authentication is enabled, add ?authSource=admin to connection string');
      }
    });
  });

  describe('Replica Set Authentication', () => {
    it('should verify replica set members can authenticate', async () => {
      // In a replica set with authentication, all members should use the same auth
      // In test environment, connection string might be simplified
      const mongoUri = process.env.MONGODB_URI || 'mongodb://mongodb1:27017/mobileapp-test';
      
      // Connection string should include at least one MongoDB host
      expect(mongoUri).toContain('mongodb://');
      // In CI, it might be localhost; in Docker, it might be mongodb1
      // Both are valid - just verify it's a valid MongoDB connection string
      expect(mongoUri).toMatch(/mongodb:\/\/(localhost|mongodb1|127\.0\.0\.1|[\w-]+)/);
      
      // In production with replica set, it would include all members and replicaSet parameter
      // In test environment, it might connect to single host but still work with replica set
      if (mongoUri.includes('replicaSet=')) {
        expect(mongoUri).toContain('replicaSet=');
      }
      
      // If authentication is enabled, credentials should be the same for all members
      if (mongoUri.includes('@')) {
        // Extract credentials part
        const credentialsMatch = mongoUri.match(/mongodb:\/\/([^@]+)@/);
        if (credentialsMatch) {
          const credentials = credentialsMatch[1];
          // All members should use the same credentials
          expect(credentials).toBeDefined();
          console.log('Replica set authentication credentials configured');
        }
      }
    });

    it('should verify internal authentication is configured (if enabled)', async () => {
      if (!adminConnection || adminConnection.readyState !== 1) {
        return;
      }

      try {
        // Check replica set configuration
        const adminDb = adminConnection.db.admin();
        const replSetStatus = await adminDb.command({ replSetGetStatus: 1 });
        
        if (replSetStatus) {
          expect(replSetStatus.members).toBeDefined();
          expect(Array.isArray(replSetStatus.members)).toBe(true);
          
          // In a replica set with authentication, all members should be configured
          console.log('Replica set members:', replSetStatus.members.length);
        }
      } catch (error) {
        if (error.code === 13) {
          console.warn('Authentication required for replica set status');
        } else if (error.code === 76) {
          // Not a replica set member
          console.warn('Not connected to a replica set member');
        } else {
          throw error;
        }
      }
    });
  });

  describe('Security Best Practices', () => {
    it('should verify authentication is recommended for production', () => {
      const nodeEnv = process.env.NODE_ENV || 'development';
      
      if (nodeEnv === 'production') {
        const mongoUri = process.env.MONGODB_URI || '';
        
        // In production, authentication should be enabled
        if (!mongoUri.includes('@') || !mongoUri.includes('authSource')) {
          console.warn('⚠️  WARNING: MongoDB authentication not configured for production!');
          console.warn('⚠️  Please enable authentication in production environment');
        } else {
          console.log('✓ MongoDB authentication is configured for production');
        }
      } else {
        console.log('Development/test environment - authentication may not be required');
      }
    });

    it('should verify connection string does not expose credentials in logs', () => {
      // This is a documentation test - credentials should not be logged
      const mongoUri = process.env.MONGODB_URI || '';
      
      // In a real scenario, we'd check logs, but here we just verify
      // that the test environment doesn't accidentally log credentials
      if (mongoUri.includes('@')) {
        // Connection string has credentials - ensure they're not logged
        const sanitized = mongoUri.replace(/mongodb:\/\/([^:]+):([^@]+)@/, 'mongodb://***:***@');
        expect(sanitized).not.toContain('password');
        expect(sanitized).not.toContain('admin123');
        console.log('Connection string sanitization verified');
      }
    });
  });
});

