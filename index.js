'use strict';

const Fx = require('fixture-interface');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocument} = require('@aws-sdk/lib-dynamodb');

/**
 * Base class for interfacing with AWS DynamoDB using the fixture-interface pattern.
 * Provides methods for inserting and removing data from DynamoDB tables for testing purposes.
 */
class DynamoFx extends Fx {

  /**
   * Creates a new DynamoDB fixture interface
   * @param {DynamoDBClientConfig} connConfig - DynamoDB connection configuration
   * @param {string} tableName - Name of the DynamoDB table to operate on
   */
  constructor(connConfig, tableName) {
    super();

    /** @type {string} */
    this.tableName = tableName;

    // setup dynamo connection info
    const baseClient = new DynamoDBClient(connConfig);
    const client = DynamoDBDocument.from(baseClient);
    /** @type {DynamoDBDocumentClient} */
    this.db = client;
  }

  /**
   * Inserts an item into the DynamoDB table
   * @param {any} item - The item to insert into the table
   * @returns {Promise<PutCommandOutput>} Promise that resolves when the item is inserted
   */
  insert(item) {
    return this.db.put({TableName: this.tableName, Item: item});
  }

  /**
   * Removes an item from the DynamoDB table
   * @param {any} keyOrItem - The key identifying the item to remove, or the full item object
   * @returns {Promise<DeleteCommandOutput>} Promise that resolves when the item is removed
   */
  remove(keyOrItem) {
    const key = this.getKey(keyOrItem);
    return this.db.delete({TableName: this.tableName, Key: key});
  }

  /**
   * Helper for getting an item out of a DynamoDB table.  Useful when checking what was inserted into the DB.
   * @param {any} keyOrItem - The key identifying the item to get, or the full item object
   * @returns {Promise<Document>} The item from DynamoDB
   */
  get(keyOrItem) {
    const key = this.getKey(keyOrItem);
    return this.db.get({TableName: this.tableName, Key: key});
  }

  /**
   * Extract the key attributes from a full item object or return the key if already a key.
   * Override this method if using composite keys or different key structures.
   * @param {any} keyOrItem - The key object or full item object
   * @returns {any} The key object for DynamoDB operations
   */
  getKey(keyOrItem) {
    // Extract key from full item object
    if (keyOrItem?.partitionKey !== undefined && keyOrItem?.sortKey !== undefined) {
      return {
        partitionKey: keyOrItem.partitionKey,
        sortKey: keyOrItem.sortKey
      };
    } else if (keyOrItem?.id !== undefined) {
      return { id: keyOrItem.id };
    } else {
      // Fallback: assume the input is already a key
      return keyOrItem;
    }
  }
}

module.exports = DynamoFx;
