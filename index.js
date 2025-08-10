'use strict';

const Fx = require('fixture-interface');
const Aws = require('aws-sdk');

/**
 * Base class for interfacing with AWS DynamoDB using the fixture-interface pattern.
 * Provides methods for inserting and removing data from DynamoDB tables for testing purposes.
 */
class DynamoFx extends Fx {

  /**
   * Creates a new DynamoDB fixture interface
   * @param {AWS.DynamoDB.DocumentClient.DocumentClientOptions & AWS.DynamoDB.Types.ClientConfiguration} connConfig - DynamoDB connection configuration
   * @param {string} tableName - Name of the DynamoDB table to operate on
   */
  constructor(connConfig, tableName) {
    super();

    /** @type {string} */
    this.tableName = tableName;

    // setup dynamo connection info
    const client = new Aws.DynamoDB.DocumentClient(connConfig);
    /** @type {AWS.DynamoDB.DocumentClient} */
    this.db = client;
  }

  /**
   * Inserts an item into the DynamoDB table
   * @param {any} item - The item to insert into the table
   * @returns {Promise<AWS.DynamoDB.DocumentClient.PutItemOutput>} Promise that resolves when the item is inserted
   */
  insert(item) {
    return this.db.putAsync({TableName: this.tableName, Item: item});
  }

  /**
   * Removes an item from the DynamoDB table
   * @param {any} key - The key identifying the item to remove
   * @returns {Promise<AWS.DynamoDB.DocumentClient.DeleteItemOutput>} Promise that resolves when the item is removed
   */
  remove(key) {
    return this.db.deleteAsync({TableName: this.tableName, Key: key});
  }
}

module.exports = DynamoFx;
