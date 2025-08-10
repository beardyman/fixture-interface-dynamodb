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
  let mockAws;
  let mockFx;
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    // Mock the DocumentClient
    mockDocumentClient = {
      putAsync: sandbox.stub(),
      deleteAsync: sandbox.stub()
    };

    // Mock AWS SDK
    mockAws = {
      DynamoDB: {
        DocumentClient: sandbox.stub().returns(mockDocumentClient)
      }
    };

    // Load DynamoFx with mocked dependencies
    DynamoFx = proxyquire('../../index.js', {
      'aws-sdk': mockAws
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

    it('should create DocumentClient with provided config', () => {
      const connConfig = {
        region: 'us-west-2',
        accessKeyId: 'test-key',
        secretAccessKey: 'test-secret'
      };
      const tableName = 'test-table';

      new DynamoFx(connConfig, tableName);

      expect(mockAws.DynamoDB.DocumentClient).to.have.been.calledOnceWith(connConfig);
    });

    it('should store DocumentClient instance', () => {
      const connConfig = { region: 'us-east-1' };
      const tableName = 'test-table';

      const instance = new DynamoFx(connConfig, tableName);

      expect(instance.db).to.equal(mockDocumentClient);
    });

    it('should handle empty connection config', () => {
      const connConfig = {};
      const tableName = 'test-table';

      const instance = new DynamoFx(connConfig, tableName);

      expect(mockAws.DynamoDB.DocumentClient).to.have.been.calledOnceWith(connConfig);
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

    it('should call DocumentClient putAsync with correct parameters', async () => {
      const item = { id: '123', name: 'test item', value: 42 };

      await dynamoFx.insert(item);

      expect(mockDocumentClient.putAsync).to.have.been.calledOnceWith({
        TableName: 'test-table',
        Item: item
      });
    });

    it('should return the promise from putAsync', () => {
      const item = { id: '456', data: 'test' };
      const expectedPromise = Promise.resolve({ ConsumedCapacity: {} });
      mockDocumentClient.putAsync.returns(expectedPromise);

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

      expect(mockDocumentClient.putAsync).to.have.been.calledOnceWith({
        TableName: 'test-table',
        Item: complexItem
      });
    });

    it('should handle null/undefined items', async () => {
      await dynamoFx.insert(null);
      await dynamoFx.insert(undefined);

      expect(mockDocumentClient.putAsync).to.have.been.calledTwice;
      expect(mockDocumentClient.putAsync.firstCall).to.have.been.calledWith({
        TableName: 'test-table',
        Item: null
      });
      expect(mockDocumentClient.putAsync.secondCall).to.have.been.calledWith({
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

    it('should call DocumentClient deleteAsync with correct parameters', async () => {
      const key = { id: '123' };

      await dynamoFx.remove(key);

      expect(mockDocumentClient.deleteAsync).to.have.been.calledOnceWith({
        TableName: 'test-table',
        Key: key
      });
    });

    it('should return the promise from deleteAsync', () => {
      const key = { id: '456' };
      const expectedPromise = Promise.resolve({ ConsumedCapacity: {} });
      mockDocumentClient.deleteAsync.returns(expectedPromise);

      const result = dynamoFx.remove(key);

      expect(result).to.equal(expectedPromise);
    });

    it('should handle composite keys', async () => {
      const compositeKey = {
        partitionKey: 'pk-123',
        sortKey: 'sk-456'
      };

      await dynamoFx.remove(compositeKey);

      expect(mockDocumentClient.deleteAsync).to.have.been.calledOnceWith({
        TableName: 'test-table',
        Key: compositeKey
      });
    });

    it('should handle string keys', async () => {
      const stringKey = 'simple-key';

      await dynamoFx.remove(stringKey);

      expect(mockDocumentClient.deleteAsync).to.have.been.calledOnceWith({
        TableName: 'test-table',
        Key: stringKey
      });
    });

    it('should handle null/undefined keys', async () => {
      await dynamoFx.remove(null);
      await dynamoFx.remove(undefined);

      expect(mockDocumentClient.deleteAsync).to.have.been.calledTwice;
      expect(mockDocumentClient.deleteAsync.firstCall).to.have.been.calledWith({
        TableName: 'test-table',
        Key: null
      });
      expect(mockDocumentClient.deleteAsync.secondCall).to.have.been.calledWith({
        TableName: 'test-table',
        Key: undefined
      });
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

      mockDocumentClient.putAsync.resolves({ ConsumedCapacity: {} });
      mockDocumentClient.deleteAsync.resolves({ ConsumedCapacity: {} });

      await dynamoFx.insert(item);
      await dynamoFx.remove(key);

      expect(mockDocumentClient.putAsync).to.have.been.calledOnceWith({
        TableName: 'integration-table',
        Item: item
      });
      expect(mockDocumentClient.deleteAsync).to.have.been.calledOnceWith({
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

      expect(mockDocumentClient.putAsync.firstCall.args[0].TableName).to.equal('integration-table');
      expect(mockDocumentClient.putAsync.secondCall.args[0].TableName).to.equal('integration-table');
      expect(mockDocumentClient.deleteAsync.firstCall.args[0].TableName).to.equal('integration-table');
    });

    it('should handle different table instances independently', () => {
      const connConfig = { region: 'us-west-2' };
      const dynamoFx2 = new DynamoFx(connConfig, 'different-table');

      const item = { id: 'multi-123' };

      dynamoFx.insert(item);
      dynamoFx2.insert(item);

      expect(mockDocumentClient.putAsync).to.have.been.calledTwice;
      expect(mockDocumentClient.putAsync.firstCall.args[0].TableName).to.equal('integration-table');
      expect(mockDocumentClient.putAsync.secondCall.args[0].TableName).to.equal('different-table');
    });
  });

  describe('error handling scenarios', () => {
    let dynamoFx;

    beforeEach(() => {
      const connConfig = { region: 'us-east-1' };
      const tableName = 'error-table';
      dynamoFx = new DynamoFx(connConfig, tableName);
    });

    it('should propagate putAsync errors', async () => {
      const item = { id: 'error-123' };
      const expectedError = new Error('DynamoDB put failed');
      mockDocumentClient.putAsync.rejects(expectedError);

      try {
        await dynamoFx.insert(item);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.equal(expectedError);
      }
    });

    it('should propagate deleteAsync errors', async () => {
      const key = { id: 'error-456' };
      const expectedError = new Error('DynamoDB delete failed');
      mockDocumentClient.deleteAsync.rejects(expectedError);

      try {
        await dynamoFx.remove(key);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.equal(expectedError);
      }
    });
  });
});
