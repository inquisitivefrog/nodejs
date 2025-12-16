const { getReadConnection, getWriteConnection } = require('../config/database-pools');

/**
 * Helper to get the appropriate model for read operations
 * Uses read connection pool (secondaryPreferred)
 */
const getReadModel = async (modelName, schema) => {
  const readConn = await getReadConnection();
  // Return model from read connection if it exists, otherwise create it
  if (readConn.models[modelName]) {
    return readConn.models[modelName];
  }
  return readConn.model(modelName, schema);
};

/**
 * Helper to get the appropriate model for write operations
 * Uses write connection pool (primary)
 */
const getWriteModel = async (modelName, schema) => {
  const writeConn = await getWriteConnection();
  // Return model from write connection if it exists, otherwise create it
  if (writeConn.models[modelName]) {
    return writeConn.models[modelName];
  }
  return writeConn.model(modelName, schema);
};

/**
 * Helper to execute a read operation using read pool
 */
const executeRead = async (operation) => {
  const readConn = await getReadConnection();
  return operation(readConn);
};

/**
 * Helper to execute a write operation using write pool
 */
const executeWrite = async (operation) => {
  const writeConn = await getWriteConnection();
  return operation(writeConn);
};

module.exports = {
  getReadModel,
  getWriteModel,
  executeRead,
  executeWrite,
};



