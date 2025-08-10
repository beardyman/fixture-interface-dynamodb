'use strict';

const { spawn } = require('child_process');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  CreateTableCommand,
  DeleteTableCommand,
  ListTablesCommand,
  DescribeTableCommand
} = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

class DynamoDBTestHelper {
  constructor() {
    this.dynamoProcess = null;
    this.client = null;
    this.docClient = null;
    this.port = 8000;
    this.endpoint = `http://localhost:${this.port}`;
  }

  /**
   * Start DynamoDB Local process
   */
  async startDynamoDB() {
    return new Promise((resolve, reject) => {
      // Use dynamodb-local package
      const dynamoLocal = require('dynamodb-local');

      dynamoLocal.launch(this.port, null, [], false, true)
        .then(() => {
          // Wait a bit for DynamoDB to be ready
          setTimeout(() => {
            this.client = new DynamoDBClient({
              region: 'us-east-1',
              endpoint: this.endpoint,
              credentials: {
                accessKeyId: 'fakeKey',
                secretAccessKey: 'fakeSecret'
              }
            });

            this.docClient = DynamoDBDocumentClient.from(this.client);
            resolve();
          }, 2000);
        })
        .catch(reject);
    });
  }

  /**
   * Stop DynamoDB Local process
  //  */
  async stopDynamoDB() {
    const dynamoLocal = require('dynamodb-local');
    await dynamoLocal.stop(this.port);
  }

  /**
   * Create a test table
   */
  async createTable(tableName, keySchema = null, attributeDefinitions = null) {
    const defaultKeySchema = [
      {
        AttributeName: 'id',
        KeyType: 'HASH'
      }
    ];

    const defaultAttributeDefinitions = [
      {
        AttributeName: 'id',
        AttributeType: 'S'
      }
    ];

    const createTableParams = {
      TableName: tableName,
      KeySchema: keySchema || defaultKeySchema,
      AttributeDefinitions: attributeDefinitions || defaultAttributeDefinitions,
      BillingMode: 'PAY_PER_REQUEST'
    };

    try {
      await this.client.send(new CreateTableCommand(createTableParams));

      // Wait for table to be active
      await this.waitForTableActive(tableName);
    } catch (error) {
      if (error.name !== 'ResourceInUseException') {
        throw error;
      }
    }
  }

  /**
   * Delete a test table
   */
  async deleteTable(tableName) {
    try {
      await this.client.send(new DeleteTableCommand({ TableName: tableName }));
    } catch (error) {
      if (error.name !== 'ResourceNotFoundException') {
        throw error;
      }
    }
  }

  /**
   * Wait for table to become active
   */
  async waitForTableActive(tableName, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const result = await this.client.send(new DescribeTableCommand({ TableName: tableName }));
        if (result.Table.TableStatus === 'ACTIVE') {
          return;
        }
      } catch (error) {
        // Table might not exist yet
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(`Table ${tableName} did not become active within ${maxAttempts} seconds`);
  }

  /**
   * Clean up all test tables
   */
  async cleanupTables() {
    try {
      const result = await this.client.send(new ListTablesCommand({}));
      const tableNames = result.TableNames || [];

      await Promise.all(
        tableNames.map(tableName => this.deleteTable(tableName))
      );
    } catch (error) {
      // Ignore cleanup errors
      console.warn('Error during table cleanup:', error.message);
    }
  }

  /**
   * Get connection config for aws-sdk v2 (for our DynamoFx class)
   */
  getConnectionConfig() {
    return {
      region: 'us-east-1',
      endpoint: this.endpoint,
      credentials: {
        accessKeyId: 'fakeKey',
        secretAccessKey: 'fakeSecret'
      }
    };
  }

  /**
   * Get the v3 document client for direct operations
   */
  getDocumentClient() {
    return this.docClient;
  }
}

module.exports = DynamoDBTestHelper;
