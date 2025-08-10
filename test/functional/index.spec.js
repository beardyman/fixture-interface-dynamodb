'use strict';

const { expect } = require('chai');
const { GetCommand, ScanCommand, PutCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const DynamoDBTestHelper = require('./dynamodb-helper');
const DynamoFx = require('../../index');

describe('DynamoFx - Functional Tests', function() {
  // Increase timeout for DynamoDB operations
  this.timeout(30000);

  let dbHelper;
  let dynamoFx;
  const testTableName = 'test-fixture-table';

  before(async () => {
    dbHelper = new DynamoDBTestHelper();
    await dbHelper.startDynamoDB();
  });

  after(async () => {
    await dbHelper.stopDynamoDB();
  });

  beforeEach(async () => {
    // Create test table
    await dbHelper.createTable(testTableName);

    const connConfig = dbHelper.getConnectionConfig();
    dynamoFx = new DynamoFx(connConfig, testTableName);
  });

  afterEach(async () => {
    // Clean up tables
    await dbHelper.cleanupTables();
  });

  describe('insert operations', () => {
    it('should successfully insert an item into DynamoDB', async () => {
      const testItem = {
        id: 'test-insert-1',
        name: 'Test Item',
        value: 42,
        timestamp: new Date().toISOString()
      };

      // Insert using DynamoFx
      await dynamoFx.insert(testItem);

      // Verify the item was inserted using v3 SDK
      const docClient = dbHelper.getDocumentClient();
      const getResult = await docClient.send(new GetCommand({
        TableName: testTableName,
        Key: { id: 'test-insert-1' }
      }));

      expect(getResult.Item).to.deep.equal(testItem);
    });

    it('should handle complex nested objects', async () => {
      const complexItem = {
        id: 'complex-item-1',
        metadata: {
          tags: ['test', 'functional'],
          config: {
            enabled: true,
            retries: 3
          }
        },
        items: [
          { name: 'item1', count: 5 },
          { name: 'item2', count: 10 }
        ]
      };

      await dynamoFx.insert(complexItem);

      const docClient = dbHelper.getDocumentClient();
      const getResult = await docClient.send(new GetCommand({
        TableName: testTableName,
        Key: { id: 'complex-item-1' }
      }));

      expect(getResult.Item).to.deep.equal(complexItem);
    });

    it('should handle multiple inserts', async () => {
      const items = [
        { id: 'multi-1', data: 'first' },
        { id: 'multi-2', data: 'second' },
        { id: 'multi-3', data: 'third' }
      ];

      // Insert all items
      for (const item of items) {
        await dynamoFx.insert(item);
      }

      // Verify all items exist
      const docClient = dbHelper.getDocumentClient();
      const scanResult = await docClient.send(new ScanCommand({
        TableName: testTableName
      }));

      expect(scanResult.Items).to.have.lengthOf(3);
      expect(scanResult.Items).to.deep.include.members(items);
    });
  });

  describe('remove operations', () => {
    beforeEach(async () => {
      // Pre-populate with test data
      const docClient = dbHelper.getDocumentClient();
      const testItems = [
        { id: 'remove-1', data: 'first' },
        { id: 'remove-2', data: 'second' },
        { id: 'remove-3', data: 'third' }
      ];

      for (const item of testItems) {
        await docClient.send(new PutCommand({
          TableName: testTableName,
          Item: item
        }));
      }
    });

    it('should successfully remove an item from DynamoDB', async () => {
      // Remove using DynamoFx
      await dynamoFx.remove({ id: 'remove-1' });

      // Verify item was removed
      const docClient = dbHelper.getDocumentClient();
      const getResult = await docClient.send(new GetCommand({
        TableName: testTableName,
        Key: { id: 'remove-1' }
      }));

      expect(getResult.Item).to.be.undefined;

      // Verify other items still exist
      const scanResult = await docClient.send(new ScanCommand({
        TableName: testTableName
      }));

      expect(scanResult.Items).to.have.lengthOf(2);
      expect(scanResult.Items.map(item => item.id)).to.not.include('remove-1');
    });

    it('should handle removing non-existent items gracefully', async () => {
      const result = await dynamoFx.remove({ id: 'non-existent' });

      expect(result).to.be.an('object');
      expect(result).to.have.property('$metadata');
    })
  });

  describe('get operations', () => {
    beforeEach(async () => {
      // Pre-populate with test data
      const docClient = dbHelper.getDocumentClient();
      const testItems = [
        { id: 'get-1', data: 'first item', value: 100 },
        { id: 'get-2', data: 'second item', value: 200 },
        { id: 'get-3', data: 'third item', value: 300 }
      ];

      for (const item of testItems) {
        await docClient.send(new PutCommand({
          TableName: testTableName,
          Item: item
        }));
      }
    });

    it('should successfully retrieve an existing item from DynamoDB', async () => {
      const result = await dynamoFx.get({ id: 'get-1' });

      expect(result).to.be.an('object');
      expect(result).to.have.property('Item');
      expect(result.Item).to.deep.equal({
        id: 'get-1',
        data: 'first item',
        value: 100
      });
    });

    it('should handle retrieving multiple different items', async () => {
      const result1 = await dynamoFx.get({ id: 'get-1' });
      const result2 = await dynamoFx.get({ id: 'get-2' });
      const result3 = await dynamoFx.get({ id: 'get-3' });

      expect(result1.Item.id).to.equal('get-1');
      expect(result1.Item.value).to.equal(100);

      expect(result2.Item.id).to.equal('get-2');
      expect(result2.Item.value).to.equal(200);

      expect(result3.Item.id).to.equal('get-3');
      expect(result3.Item.value).to.equal(300);
    });

    it('should handle non-existent items gracefully', async () => {
      const result = await dynamoFx.get({ id: 'non-existent-item' });

      expect(result).to.be.an('object');
      expect(result).to.have.property('$metadata');
      expect(result).to.not.have.property('Item');
    });

    it('should return consistent results when getting same item multiple times', async () => {
      const result1 = await dynamoFx.get({ id: 'get-2' });
      const result2 = await dynamoFx.get({ id: 'get-2' });

      expect(result1.Item).to.deep.equal(result2.Item);
    });

    it('should retrieve items after they are inserted via DynamoFx', async () => {
      const newItem = { id: 'get-new', data: 'newly inserted', value: 999 };

      // Insert using DynamoFx
      await dynamoFx.insert(newItem);

      // Retrieve using DynamoFx
      const result = await dynamoFx.get({ id: 'get-new' });

      expect(result.Item).to.deep.equal(newItem);
    });

    it('should not retrieve items after they are removed', async () => {
      // Verify item exists first
      let result = await dynamoFx.get({ id: 'get-1' });
      expect(result.Item).to.exist;

      // Remove the item
      await dynamoFx.remove({ id: 'get-1' });

      // Try to get the removed item
      result = await dynamoFx.get({ id: 'get-1' });
      expect(result).to.not.have.property('Item');
    });

    it('should handle complex nested objects', async () => {
      const complexItem = {
        id: 'complex-get',
        metadata: {
          tags: ['functional', 'test'],
          config: {
            enabled: true,
            retries: 5
          }
        },
        items: [
          { name: 'item1', count: 10 },
          { name: 'item2', count: 20 }
        ]
      };

      // Insert complex item
      await dynamoFx.insert(complexItem);

      // Retrieve complex item
      const result = await dynamoFx.get({ id: 'complex-get' });

      expect(result.Item).to.deep.equal(complexItem);
    });

    it('should return AWS response object structure', async () => {
      const result = await dynamoFx.get({ id: 'get-1' });

      expect(result).to.be.an('object');
      expect(result).to.have.property('$metadata');
      expect(result).to.have.property('Item');
    });
  });

  describe('fixture-interface integration', () => {
    const testData = [
      { id: 'fixture-1', name: 'First Fixture', type: 'test' },
      { id: 'fixture-2', name: 'Second Fixture', type: 'test' },
      { id: 'fixture-3', name: 'Third Fixture', type: 'demo' }
    ];

    it('should provision data using the provision method', async () => {
      // Use provision method from fixture-interface
      await dynamoFx.provision(testData);

      // Verify all data was inserted
      const docClient = dbHelper.getDocumentClient();
      const scanResult = await docClient.send(new ScanCommand({
        TableName: testTableName
      }));

      expect(scanResult.Items).to.have.lengthOf(3);
      expect(scanResult.Items).to.deep.include.members(testData);

      // Verify internal data array was populated
      expect(dynamoFx.data).to.have.lengthOf(3);
    });

    it('should add data for tracking with addData method', async () => {
      const initialItem = { id: 'initial', data: 'initial' };
      await dynamoFx.insert(initialItem);

      // Add to tracking
      dynamoFx.addData(initialItem);

      expect(dynamoFx.data).to.have.lengthOf(1);
      expect(dynamoFx.data[0]).to.deep.equal(initialItem);
    });

    it('should cleanup all tracked data', async () => {
      // Provision data
      await dynamoFx.provision(testData);

      // Add additional data
      const extraItem = { id: 'extra', data: 'extra' };
      await dynamoFx.insert(extraItem);
      dynamoFx.addData(extraItem);

      // Verify data exists
      let docClient = dbHelper.getDocumentClient();
      let scanResult = await docClient.send(new ScanCommand({
        TableName: testTableName
      }));
      expect(scanResult.Items).to.have.lengthOf(4);

      // Cleanup
      await dynamoFx.cleanup();

      // Verify all tracked data was removed
      scanResult = await docClient.send(new ScanCommand({
        TableName: testTableName
      }));
      expect(scanResult.Items).to.have.lengthOf(0);

      // Verify internal data array was cleared
      expect(dynamoFx.data).to.have.lengthOf(0);
    });

    it('should handle provision with empty array', async () => {
      await dynamoFx.provision([]);

      expect(dynamoFx.data).to.have.lengthOf(0);

      const docClient = dbHelper.getDocumentClient();
      const scanResult = await docClient.send(new ScanCommand({
        TableName: testTableName
      }));
      expect(scanResult.Items).to.have.lengthOf(0);
    });
  });

  describe('error handling', () => {
    it('should handle DynamoDB errors during insert', async () => {
      // Create DynamoFx with invalid table name
      const invalidFx = new DynamoFx(dbHelper.getConnectionConfig(), 'non-existent-table');

      const testItem = { id: 'test', data: 'test' };

      try {
        await invalidFx.insert(testItem);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.an('error');
        expect(error.message).to.include('non-existent');
      }
    });

    it('should handle DynamoDB errors during remove', async () => {
      // Create DynamoFx with invalid table name
      const invalidFx = new DynamoFx(dbHelper.getConnectionConfig(), 'non-existent-table');

      try {
        await invalidFx.remove({ id: 'test' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.an('error');
        expect(error.message).to.include('non-existent');
      }
    });

    it('should handle provision errors gracefully', async () => {
      const invalidFx = new DynamoFx(dbHelper.getConnectionConfig(), 'non-existent-table');
      const testData = [{ id: 'test', data: 'test' }];

      try {
        await invalidFx.provision(testData);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.an('error');
        // Data array should still be empty on error
        expect(invalidFx.data).to.have.lengthOf(0);
      }
    });

    it('should handle DynamoDB errors during get', async () => {
      // Create DynamoFx with invalid table name
      const invalidFx = new DynamoFx(dbHelper.getConnectionConfig(), 'non-existent-table');

      try {
        await invalidFx.get({ id: 'test' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.an('error');
        expect(error.message).to.include('non-existent');
      }
    });
  });

  describe('composite key operations', () => {
    const compositeTableName = 'composite-test-table';

    beforeEach(async () => {
      // Create table with composite key
      await dbHelper.createTable(
        compositeTableName,
        [
          { AttributeName: 'partitionKey', KeyType: 'HASH' },
          { AttributeName: 'sortKey', KeyType: 'RANGE' }
        ],
        [
          { AttributeName: 'partitionKey', AttributeType: 'S' },
          { AttributeName: 'sortKey', AttributeType: 'S' }
        ]
      );

      dynamoFx = new DynamoFx(dbHelper.getConnectionConfig(), compositeTableName);
    });

    it('should handle composite key inserts and removes', async () => {
      const compositeItem = {
        partitionKey: 'user#123',
        sortKey: 'order#456',
        data: 'composite test data',
        amount: 99.99
      };

      // Insert
      await dynamoFx.insert(compositeItem);

      // Verify insert
      const docClient = dbHelper.getDocumentClient();
      const getResult = await docClient.send(new GetCommand({
        TableName: compositeTableName,
        Key: {
          partitionKey: 'user#123',
          sortKey: 'order#456'
        }
      }));
      expect(getResult.Item).to.deep.equal(compositeItem);

      // Remove
      await dynamoFx.remove({
        partitionKey: 'user#123',
        sortKey: 'order#456'
      });

      // Verify removal
      const getResult2 = await docClient.send(new GetCommand({
        TableName: compositeTableName,
        Key: {
          partitionKey: 'user#123',
          sortKey: 'order#456'
        }
      }));
      expect(getResult2.Item).to.be.undefined;
    });

    it('should handle composite key get operations', async () => {
      const compositeItems = [
        {
          partitionKey: 'user#123',
          sortKey: 'order#001',
          data: 'first order',
          amount: 25.50
        },
        {
          partitionKey: 'user#123',
          sortKey: 'order#002',
          data: 'second order',
          amount: 75.25
        },
        {
          partitionKey: 'user#456',
          sortKey: 'order#001',
          data: 'different user order',
          amount: 100.00
        }
      ];

      // Insert test data
      for (const item of compositeItems) {
        await dynamoFx.insert(item);
      }

      // Test getting specific items with composite keys
      const result1 = await dynamoFx.get({
        partitionKey: 'user#123',
        sortKey: 'order#001'
      });
      expect(result1.Item).to.deep.equal(compositeItems[0]);

      const result2 = await dynamoFx.get({
        partitionKey: 'user#123',
        sortKey: 'order#002'
      });
      expect(result2.Item).to.deep.equal(compositeItems[1]);

      const result3 = await dynamoFx.get({
        partitionKey: 'user#456',
        sortKey: 'order#001'
      });
      expect(result3.Item).to.deep.equal(compositeItems[2]);

      // Test non-existent composite key
      const result4 = await dynamoFx.get({
        partitionKey: 'user#999',
        sortKey: 'order#999'
      });
      expect(result4).to.not.have.property('Item');
    });
  });

  describe('concurrent operations', () => {
    it('should handle concurrent inserts', async () => {
      const concurrentItems = Array.from({ length: 10 }, (_, i) => ({
        id: `concurrent-${i}`,
        data: `data-${i}`,
        timestamp: new Date().toISOString()
      }));

      // Insert all items concurrently
      await Promise.all(
        concurrentItems.map(item => dynamoFx.insert(item))
      );

      // Verify all items were inserted
      const docClient = dbHelper.getDocumentClient();
      const scanResult = await docClient.send(new ScanCommand({
        TableName: testTableName
      }));

      expect(scanResult.Items).to.have.lengthOf(10);
      expect(scanResult.Items).to.deep.include.members(concurrentItems);
    });

    it('should handle mixed concurrent operations', async () => {
      // Pre-populate some data
      const docClient = dbHelper.getDocumentClient();
      const initialItems = [
        { id: 'mixed-1', data: 'initial' },
        { id: 'mixed-2', data: 'initial' }
      ];

      for (const item of initialItems) {
        await docClient.send(new PutCommand({
          TableName: testTableName,
          Item: item
        }));
      }

      // Perform mixed operations concurrently
      const operations = [
        dynamoFx.insert({ id: 'mixed-3', data: 'new' }),
        dynamoFx.insert({ id: 'mixed-4', data: 'new' }),
        dynamoFx.remove({ id: 'mixed-1' }),
        dynamoFx.insert({ id: 'mixed-5', data: 'new' })
      ];

      await Promise.all(operations);

      // Verify final state
      const scanResult = await docClient.send(new ScanCommand({
        TableName: testTableName
      }));

      expect(scanResult.Items).to.have.lengthOf(4);
      const ids = scanResult.Items.map(item => item.id);
      expect(ids).to.include.members(['mixed-2', 'mixed-3', 'mixed-4', 'mixed-5']);
      expect(ids).to.not.include('mixed-1');
    });

    it('should handle concurrent get operations', async () => {
      // Pre-populate data
      const testItems = [
        { id: 'concurrent-get-1', data: 'data1' },
        { id: 'concurrent-get-2', data: 'data2' },
        { id: 'concurrent-get-3', data: 'data3' },
        { id: 'concurrent-get-4', data: 'data4' },
        { id: 'concurrent-get-5', data: 'data5' }
      ];

      for (const item of testItems) {
        await dynamoFx.insert(item);
      }

      // Perform concurrent get operations
      const getOperations = testItems.map(item =>
        dynamoFx.get({ id: item.id })
      );

      const results = await Promise.all(getOperations);

      // Verify all items were retrieved correctly
      expect(results).to.have.lengthOf(5);
      results.forEach((result, index) => {
        expect(result.Item).to.deep.equal(testItems[index]);
      });
    });
  });
});
