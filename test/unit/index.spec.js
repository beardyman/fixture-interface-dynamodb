'use strict';

const chai = require('chai');
const { expect } = chai;
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const Fixture = require("fixture-interface");
const proxyquire = require('proxyquire').noCallThru();

chai.use(sinonChai);

describe('DynamoFx', () => {
  let DynamoFx;
  let mockDocumentClient;
  let mockDynamoDBClient;
  let mockDynamoDBDocument;
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    // Mock the DynamoDBDocument client
    mockDocumentClient = {
      put: sandbox.stub(),
      delete: sandbox.stub(),
      get: sandbox.stub()
    };

    // Mock DynamoDBClient
    mockDynamoDBClient = sandbox.stub();

    // Mock DynamoDBDocument
    mockDynamoDBDocument = {
      from: sandbox.stub().returns(mockDocumentClient)
    };

    // Load DynamoFx with mocked dependencies
    DynamoFx = proxyquire('../../index.js', {
      '@aws-sdk/client-dynamodb': {
        DynamoDBClient: mockDynamoDBClient
      },
      '@aws-sdk/lib-dynamodb': {
        DynamoDBDocument: mockDynamoDBDocument
      }
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('constructor', () => {
    it('should call parent constructor', () => {
      const connConfig = { region: 'us-east-1' };
      const tableName = 'test-table';

      const dyanmoFx = new DynamoFx(connConfig, tableName);

      expect(dyanmoFx.data).to.deep.equal([]);
    });

    it('should store table name', () => {
      const connConfig = { region: 'us-east-1' };
      const tableName = 'test-table';

      const instance = new DynamoFx(connConfig, tableName);

      expect(instance.tableName).to.equal(tableName);
    });

    it('should create DynamoDBClient with provided config', () => {
      const connConfig = {
        region: 'us-west-2',
        credentials: {
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret'
        }
      };
      const tableName = 'test-table';

      new DynamoFx(connConfig, tableName);

      expect(mockDynamoDBClient).to.have.been.calledOnceWith(connConfig);
    });

    it('should create DynamoDBDocument from base client', () => {
      const connConfig = { region: 'us-east-1' };
      const tableName = 'test-table';

      new DynamoFx(connConfig, tableName);

      expect(mockDynamoDBDocument.from).to.have.been.calledOnce;
    });

    it('should store DynamoDBDocument instance', () => {
      const connConfig = { region: 'us-east-1' };
      const tableName = 'test-table';

      const instance = new DynamoFx(connConfig, tableName);

      expect(instance.db).to.equal(mockDocumentClient);
    });

    it('should handle empty connection config', () => {
      const connConfig = {};
      const tableName = 'test-table';

      const instance = new DynamoFx(connConfig, tableName);

      expect(mockDynamoDBClient).to.have.been.calledOnceWith(connConfig);
      expect(instance.tableName).to.equal(tableName);
      expect(instance.db).to.equal(mockDocumentClient);
    });
  });

  describe('insert', () => {
    let dynamoFx;

    beforeEach(() => {
      const connConfig = { region: 'us-east-1' };
      const tableName = 'test-table';
      dynamoFx = new DynamoFx(connConfig, tableName);
    });

    it('should call DynamoDBDocument put with correct parameters', async () => {
      const item = { id: '123', name: 'test item', value: 42 };

      await dynamoFx.insert(item);

      expect(mockDocumentClient.put).to.have.been.calledOnceWith({
        TableName: 'test-table',
        Item: item
      });
    });

    it('should return the promise from put', () => {
      const item = { id: '456', data: 'test' };
      const expectedPromise = Promise.resolve({ ConsumedCapacity: {} });
      mockDocumentClient.put.returns(expectedPromise);

      const result = dynamoFx.insert(item);

      expect(result).to.equal(expectedPromise);
    });

    it('should handle complex item objects', async () => {
      const complexItem = {
        id: 'complex-123',
        nested: {
          prop: 'value',
          array: [1, 2, 3]
        },
        timestamp: new Date().toISOString(),
        tags: ['tag1', 'tag2']
      };

      await dynamoFx.insert(complexItem);

      expect(mockDocumentClient.put).to.have.been.calledOnceWith({
        TableName: 'test-table',
        Item: complexItem
      });
    });

    it('should handle null/undefined items', async () => {
      await dynamoFx.insert(null);
      await dynamoFx.insert(undefined);

      expect(mockDocumentClient.put).to.have.been.calledTwice;
      expect(mockDocumentClient.put.firstCall).to.have.been.calledWith({
        TableName: 'test-table',
        Item: null
      });
      expect(mockDocumentClient.put.secondCall).to.have.been.calledWith({
        TableName: 'test-table',
        Item: undefined
      });
    });
  });

  describe('remove', () => {
    let dynamoFx;

    beforeEach(() => {
      const connConfig = { region: 'us-east-1' };
      const tableName = 'test-table';
      dynamoFx = new DynamoFx(connConfig, tableName);
    });

    it('should call DynamoDBDocument delete with correct parameters', async () => {
      const key = { id: '123' };

      await dynamoFx.remove(key);

      expect(mockDocumentClient.delete).to.have.been.calledOnceWith({
        TableName: 'test-table',
        Key: key
      });
    });

    it('should return the promise from delete', () => {
      const key = { id: '456' };
      const expectedPromise = Promise.resolve({ ConsumedCapacity: {} });
      mockDocumentClient.delete.returns(expectedPromise);

      const result = dynamoFx.remove(key);

      expect(result).to.equal(expectedPromise);
    });

    it('should handle composite keys', async () => {
      const compositeKey = {
        partitionKey: 'pk-123',
        sortKey: 'sk-456'
      };

      await dynamoFx.remove(compositeKey);

      expect(mockDocumentClient.delete).to.have.been.calledOnceWith({
        TableName: 'test-table',
        Key: compositeKey
      });
    });

    it('should handle string keys', async () => {
      const stringKey = 'simple-key';

      await dynamoFx.remove(stringKey);

      expect(mockDocumentClient.delete).to.have.been.calledOnceWith({
        TableName: 'test-table',
        Key: stringKey
      });
    });

    it('should handle null/undefined keys', async () => {
      await dynamoFx.remove(null);
      await dynamoFx.remove(undefined);

      expect(mockDocumentClient.delete).to.have.been.calledTwice;
      expect(mockDocumentClient.delete.firstCall).to.have.been.calledWith({
        TableName: 'test-table',
        Key: null
      });
      expect(mockDocumentClient.delete.secondCall).to.have.been.calledWith({
        TableName: 'test-table',
        Key: undefined
      });
    });
  });

  describe('get', () => {
    let dynamoFx;
    
    beforeEach(() => {
      const connConfig = { region: 'us-east-1' };
      const tableName = 'test-table';
      dynamoFx = new DynamoFx(connConfig, tableName);
    });

    it('should call DynamoDBDocument get with correct parameters', async () => {
      const key = { id: '123' };

      await dynamoFx.get(key);

      expect(mockDocumentClient.get).to.have.been.calledOnceWith({
        TableName: 'test-table',
        Key: key
      });
    });

    it('should return the promise from get', () => {
      const key = { id: '456' };
      const expectedPromise = Promise.resolve({ Item: { id: '456', data: 'test' } });
      mockDocumentClient.get.returns(expectedPromise);

      const result = dynamoFx.get(key);

      expect(result).to.equal(expectedPromise);
    });

    it('should handle composite keys', async () => {
      const compositeKey = {
        partitionKey: 'pk-123',
        sortKey: 'sk-456'
      };

      await dynamoFx.get(compositeKey);

      expect(mockDocumentClient.get).to.have.been.calledOnceWith({
        TableName: 'test-table',
        Key: compositeKey
      });
    });

    it('should handle string keys', async () => {
      const stringKey = 'simple-key';

      await dynamoFx.get(stringKey);

      expect(mockDocumentClient.get).to.have.been.calledOnceWith({
        TableName: 'test-table',
        Key: stringKey
      });
    });

    it('should handle null/undefined keys', async () => {
      await dynamoFx.get(null);
      await dynamoFx.get(undefined);

      expect(mockDocumentClient.get).to.have.been.calledTwice;
      expect(mockDocumentClient.get.firstCall).to.have.been.calledWith({
        TableName: 'test-table',
        Key: null
      });
      expect(mockDocumentClient.get.secondCall).to.have.been.calledWith({
        TableName: 'test-table',
        Key: undefined
      });
    });

    it('should handle non-existent items', async () => {
      const key = { id: 'non-existent' };
      const expectedPromise = Promise.resolve({});
      mockDocumentClient.get.returns(expectedPromise);

      const result = await dynamoFx.get(key);

      expect(result).to.deep.equal({});
    });
  });

  describe('inheritance', () => {
    it('should extend the fixture-interface class', () => {
      const connConfig = { region: 'us-east-1' };
      const tableName = 'test-table';

      const instance = new DynamoFx(connConfig, tableName);

      expect(instance).to.be.instanceof(Fixture);
    });

    it('should have access to parent class methods', () => {
      const connConfig = { region: 'us-east-1' };
      const tableName = 'test-table';

      const instance = new DynamoFx(connConfig, tableName);

      expect(instance.provision).to.exist;
      expect(instance.addData).to.exist;
      expect(instance.cleanup).to.exist;
    });
  });

  describe('integration scenarios', () => {
    let dynamoFx;

    beforeEach(() => {
      const connConfig = { region: 'us-east-1' };
      const tableName = 'integration-table';
      dynamoFx = new DynamoFx(connConfig, tableName);
    });

    it('should handle insert and remove operations in sequence', async () => {
      const item = { id: 'seq-123', name: 'sequence test' };
      const key = { id: 'seq-123' };

      mockDocumentClient.put.resolves({ ConsumedCapacity: {} });
      mockDocumentClient.delete.resolves({ ConsumedCapacity: {} });

      await dynamoFx.insert(item);
      await dynamoFx.remove(key);

      expect(mockDocumentClient.put).to.have.been.calledOnceWith({
        TableName: 'integration-table',
        Item: item
      });
      expect(mockDocumentClient.delete).to.have.been.calledOnceWith({
        TableName: 'integration-table',
        Key: key
      });
    });

    it('should maintain table name consistency across operations', () => {
      const item1 = { id: '1', data: 'first' };
      const item2 = { id: '2', data: 'second' };
      const key1 = { id: '1' };

      dynamoFx.insert(item1);
      dynamoFx.insert(item2);
      dynamoFx.remove(key1);

      expect(mockDocumentClient.put.firstCall.args[0].TableName).to.equal('integration-table');
      expect(mockDocumentClient.put.secondCall.args[0].TableName).to.equal('integration-table');
      expect(mockDocumentClient.delete.firstCall.args[0].TableName).to.equal('integration-table');
    });

    it('should handle different table instances independently', () => {
      const connConfig = { region: 'us-west-2' };
      const dynamoFx2 = new DynamoFx(connConfig, 'different-table');

      const item = { id: 'multi-123' };

      dynamoFx.insert(item);
      dynamoFx2.insert(item);

      expect(mockDocumentClient.put).to.have.been.calledTwice;
      expect(mockDocumentClient.put.firstCall.args[0].TableName).to.equal('integration-table');
      expect(mockDocumentClient.put.secondCall.args[0].TableName).to.equal('different-table');
    });
  });

  describe('error handling scenarios', () => {
    let dynamoFx;

    beforeEach(() => {
      const connConfig = { region: 'us-east-1' };
      const tableName = 'error-table';
      dynamoFx = new DynamoFx(connConfig, tableName);
    });

    it('should propagate put errors', async () => {
      const item = { id: 'error-123' };
      const expectedError = new Error('DynamoDB put failed');
      mockDocumentClient.put.rejects(expectedError);

      try {
        await dynamoFx.insert(item);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.equal(expectedError);
      }
    });

    it('should propagate delete errors', async () => {
      const key = { id: 'error-456' };
      const expectedError = new Error('DynamoDB delete failed');
      mockDocumentClient.delete.rejects(expectedError);

      try {
        await dynamoFx.remove(key);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.equal(expectedError);
      }
    });

    it('should propagate get errors', async () => {
      const key = { id: 'error-789' };
      const expectedError = new Error('DynamoDB get failed');
      mockDocumentClient.get.rejects(expectedError);

      try {
        await dynamoFx.get(key);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.equal(expectedError);
      }
    });
  });
});
