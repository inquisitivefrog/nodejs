// Mock BullMQ before importing
const mockQueue = jest.fn();
const mockWorker = jest.fn();
const mockQueueEvents = jest.fn();

jest.mock('bullmq', () => ({
  Queue: mockQueue,
  Worker: mockWorker,
  QueueEvents: mockQueueEvents,
}));

jest.mock('../../../src/config/redis', () => {
  const mockRedis = {
    status: 'ready',
  };
  return {
    getRedisClient: jest.fn(() => mockRedis),
    getBullMQRedisConnection: jest.fn(() => mockRedis),
    connectRedis: jest.fn(() => mockRedis),
    disconnectRedis: jest.fn(),
  };
});

describe('Queue Configuration', () => {
  let mockQueueInstance;
  let originalEnv;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    jest.clearAllMocks();
    
    // Create mock queue instance
    mockQueueInstance = {
      add: jest.fn().mockResolvedValue({ id: 'job-123' }),
      close: jest.fn().mockResolvedValue(undefined),
    };
    
    mockQueue.mockImplementation(() => mockQueueInstance);
    
    // Reset modules to get fresh queue instances
    jest.resetModules();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.resetModules();
  });

  describe('getQueue', () => {
    it('should create queue with correct configuration', () => {
      process.env.NODE_ENV = 'development';
      jest.resetModules();
      const { getQueue, QUEUE_NAMES } = require('../../../src/config/queue');
      
      const queue = getQueue(QUEUE_NAMES.EMAIL);
      
      expect(mockQueue).toHaveBeenCalledWith(
        QUEUE_NAMES.EMAIL,
        expect.objectContaining({
          connection: expect.any(Object),
          defaultJobOptions: expect.objectContaining({
            attempts: 3,
            backoff: expect.objectContaining({
              type: 'exponential',
              delay: 2000,
            }),
          }),
        })
      );
    });

    it('should return null in test environment', () => {
      process.env.NODE_ENV = 'test';
      jest.resetModules();
      const { getQueue, QUEUE_NAMES } = require('../../../src/config/queue');
      
      const queue = getQueue(QUEUE_NAMES.EMAIL);
      
      expect(queue).toBeNull();
      expect(mockQueue).not.toHaveBeenCalled();
    });

    it('should return same queue instance on multiple calls', () => {
      process.env.NODE_ENV = 'development';
      jest.resetModules();
      const { getQueue, QUEUE_NAMES } = require('../../../src/config/queue');
      
      const queue1 = getQueue(QUEUE_NAMES.EMAIL);
      const queue2 = getQueue(QUEUE_NAMES.EMAIL);
      
      expect(queue1).toBe(queue2);
    });
  });

  describe('enqueueJob', () => {
    it('should enqueue job successfully', async () => {
      process.env.NODE_ENV = 'development';
      jest.resetModules();
      const { enqueueJob, QUEUE_NAMES } = require('../../../src/config/queue');
      
      const jobData = { to: 'test@example.com', subject: 'Test' };
      const job = await enqueueJob(QUEUE_NAMES.EMAIL, jobData);
      
      expect(mockQueueInstance.add).toHaveBeenCalledWith(
        QUEUE_NAMES.EMAIL,
        jobData,
        {}
      );
      expect(job).toEqual({ id: 'job-123' });
    });

    it('should return null in test environment', async () => {
      process.env.NODE_ENV = 'test';
      jest.resetModules();
      const { enqueueJob, QUEUE_NAMES } = require('../../../src/config/queue');
      
      const job = await enqueueJob(QUEUE_NAMES.EMAIL, {});
      
      expect(job).toBeNull();
      expect(mockQueueInstance.add).not.toHaveBeenCalled();
    });

    it('should pass job options to queue.add', async () => {
      process.env.NODE_ENV = 'development';
      jest.resetModules();
      const { enqueueJob, QUEUE_NAMES } = require('../../../src/config/queue');
      
      const jobData = { to: 'test@example.com' };
      const options = { priority: 10, delay: 5000 };
      
      await enqueueJob(QUEUE_NAMES.EMAIL, jobData, options);
      
      expect(mockQueueInstance.add).toHaveBeenCalledWith(
        QUEUE_NAMES.EMAIL,
        jobData,
        options
      );
    });
  });

  describe('closeQueues', () => {
    it('should close all queues', async () => {
      process.env.NODE_ENV = 'development';
      jest.resetModules();
      const { getQueue, closeQueues, QUEUE_NAMES } = require('../../../src/config/queue');
      
      // Create some queues
      getQueue(QUEUE_NAMES.EMAIL);
      getQueue(QUEUE_NAMES.NOTIFICATION);
      
      await closeQueues();
      
      expect(mockQueueInstance.close).toHaveBeenCalled();
    });
  });
});

