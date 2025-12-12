const { getReadUserModel, getWriteUserModel } = require('../../../src/utils/db-helper');
const { getReadConnection, getWriteConnection } = require('../../../src/config/database-pools');
const { getUserModel } = require('../../../src/models/User');

// Mock dependencies
jest.mock('../../../src/config/database-pools');
// Create a mock User model that can be used as both constructor and object
jest.mock('../../../src/models/User', () => {
  const mockUserModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    getUserModel: jest.fn(),
  };
  // Make it callable as a constructor
  const mockUserModelConstructor = jest.fn();
  Object.setPrototypeOf(mockUserModelConstructor, mockUserModel);
  Object.assign(mockUserModelConstructor, mockUserModel);
  return mockUserModelConstructor;
});

describe('DB Helper', () => {
  let mockReadConnection;
  let mockWriteConnection;
  let mockReadUserModel;
  let mockWriteUserModel;
  let mockDefaultUserModel;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock connections
    mockReadConnection = {
      readyState: 1,
      models: {},
      model: jest.fn(),
    };

    mockWriteConnection = {
      readyState: 1,
      models: {},
      model: jest.fn(),
    };

    // Setup mock models
    mockReadUserModel = { name: 'ReadUserModel' };
    mockWriteUserModel = { name: 'WriteUserModel' };
    mockDefaultUserModel = { name: 'DefaultUserModel' };

    // Mock getUserModel
    getUserModel.mockImplementation((connection) => {
      if (connection === mockReadConnection) {
        return mockReadUserModel;
      }
      if (connection === mockWriteConnection) {
        return mockWriteUserModel;
      }
      return mockDefaultUserModel;
    });

    // Mock getReadConnection and getWriteConnection
    getReadConnection.mockResolvedValue(mockReadConnection);
    getWriteConnection.mockResolvedValue(mockWriteConnection);
  });

  describe('getReadUserModel', () => {
    it('should return User model from read connection', async () => {
      const model = await getReadUserModel();

      expect(getReadConnection).toHaveBeenCalledTimes(1);
      expect(getUserModel).toHaveBeenCalledWith(mockReadConnection);
      expect(model).toBe(mockReadUserModel);
    });

    it('should reuse read connection on subsequent calls', async () => {
      await getReadUserModel();
      await getReadUserModel();

      expect(getReadConnection).toHaveBeenCalledTimes(2);
      expect(getUserModel).toHaveBeenCalledTimes(2);
    });

    it('should fallback to default User model if read connection fails', async () => {
      getReadConnection.mockRejectedValue(new Error('Connection failed'));

      const model = await getReadUserModel();

      expect(getReadConnection).toHaveBeenCalled();
      expect(getUserModel).not.toHaveBeenCalled();
      // In fallback, it requires the User model, which returns the mock constructor
      const UserModel = require('../../../src/models/User');
      expect(model).toBe(UserModel);
    });

    it('should fallback to default User model if read connection returns null', async () => {
      getReadConnection.mockResolvedValue(null);

      const model = await getReadUserModel();

      expect(getReadConnection).toHaveBeenCalled();
      expect(model).toBe(mockDefaultUserModel);
    });
  });

  describe('getWriteUserModel', () => {
    it('should return User model from write connection', async () => {
      const model = await getWriteUserModel();

      expect(getWriteConnection).toHaveBeenCalledTimes(1);
      expect(getUserModel).toHaveBeenCalledWith(mockWriteConnection);
      expect(model).toBe(mockWriteUserModel);
    });

    it('should reuse write connection on subsequent calls', async () => {
      await getWriteUserModel();
      await getWriteUserModel();

      expect(getWriteConnection).toHaveBeenCalledTimes(2);
      expect(getUserModel).toHaveBeenCalledTimes(2);
    });

    it('should fallback to default User model if write connection fails', async () => {
      getWriteConnection.mockRejectedValue(new Error('Connection failed'));

      const model = await getWriteUserModel();

      expect(getWriteConnection).toHaveBeenCalled();
      expect(getUserModel).not.toHaveBeenCalled();
      // In fallback, it requires the User model, which returns the mock constructor
      const UserModel = require('../../../src/models/User');
      expect(model).toBe(UserModel);
    });

    it('should fallback to default User model if write connection returns null', async () => {
      getWriteConnection.mockResolvedValue(null);

      const model = await getWriteUserModel();

      expect(getWriteConnection).toHaveBeenCalled();
      expect(model).toBe(mockDefaultUserModel);
    });
  });

  describe('Pool separation', () => {
    it('should use different connections for read and write models', async () => {
      const readModel = await getReadUserModel();
      const writeModel = await getWriteUserModel();

      expect(getReadConnection).toHaveBeenCalled();
      expect(getWriteConnection).toHaveBeenCalled();
      expect(readModel).toBe(mockReadUserModel);
      expect(writeModel).toBe(mockWriteUserModel);
      expect(readModel).not.toBe(writeModel);
    });
  });
});

