# @beardyman/fixture-interface-dynamodb

A DynamoDB implementation of the [fixture-interface](https://github.com/your-org/fixture-interface) library for test data management. This package provides a simple, consistent API for setting up and tearing down DynamoDB test data using the fixture pattern.

## Features

- **AWS SDK v3** - Built with modern AWS SDK v3 for DynamoDB operations
- **Fixture Pattern** - Extends fixture-interface for consistent test data management
- **Dual Module Support** - Works with both CommonJS and ES modules
- **TypeScript Support** - Complete TypeScript declarations included
- **Flexible Key Handling** - Works with both single keys (`id`) and composite keys (`partitionKey/sortKey`)
- **Smart Key Extraction** - Automatically extracts keys from full item objects
- **Comprehensive Testing** - Full unit and functional test coverage

## Installation

```bash
npm install @beardyman/fixture-interface-dynamodb
```

## Quick Start

### Basic Usage

```javascript
const DynamoFx = require('@beardyman/fixture-interface-dynamodb');

// Create a fixture for your DynamoDB table
const userFixture = new DynamoFx({
  region: 'us-east-1',
  endpoint: 'http://localhost:8000' // For DynamoDB Local
}, 'users');

// Test data
const testUsers = [
  { id: 'user1', name: 'John Doe', email: 'john@example.com' },
  { id: 'user2', name: 'Jane Smith', email: 'jane@example.com' }
];

// In your test setup
async function setupTest() {
  // Provision test data
  await userFixture.provision(testUsers);
}

// In your test teardown
async function cleanupTest() {
  // Remove all test data
  await userFixture.cleanup();
}
```

### Using with Mocha

```javascript
describe('User Service Tests', () => {
  let userFixture;

  before(async () => {
    userFixture = new DynamoFx({
      region: 'us-east-1',
      endpoint: 'http://localhost:8000'
    }, 'users');
  });

  beforeEach(async () => {
    const testData = [
      { id: 'test-user', name: 'Test User', email: 'test@example.com' }
    ];
    await userFixture.provision(testData);
  });

  afterEach(async () => {
    await userFixture.cleanup();
  });

  it('should find user by id', async () => {
    const result = await userFixture.get({ id: 'test-user' });
    expect(result.Item.name).to.equal('Test User');
  });
});
```

### Composite Key Tables

```javascript
const orderFixture = new DynamoFx({
  region: 'us-east-1'
}, 'orders');

// Working with composite keys
const testOrders = [
  { 
    partitionKey: 'user#123', 
    sortKey: 'order#001',
    amount: 99.99,
    status: 'pending'
  }
];

await orderFixture.provision(testOrders);

// Get specific order
const result = await orderFixture.get({
  partitionKey: 'user#123',
  sortKey: 'order#001'
});
```

## API Reference

### Constructor

```javascript
new DynamoFx(connConfig, tableName)
```

- `connConfig` - AWS DynamoDB client configuration object
- `tableName` - Name of the DynamoDB table

### Methods

#### `insert(item)`
Insert a single item into the table.
- Returns: `Promise<PutCommandOutput>`

#### `remove(keyOrItem)`
Remove an item from the table. Accepts either a key object or full item.
- Returns: `Promise<DeleteCommandOutput>`

#### `get(keyOrItem)`
Retrieve an item from the table. Accepts either a key object or full item.
- Returns: `Promise<GetCommandOutput>`

#### `provision(items)`
Insert multiple items and track them for cleanup (inherited from fixture-interface).
- Returns: `Promise<Array>`

#### `cleanup()`
Remove all tracked items (inherited from fixture-interface).
- Returns: `Promise<void>`

#### `addData(item)`
Add an item to the cleanup tracking list (inherited from fixture-interface).
- Returns: `number`

#### `getKey(keyOrItem)`
Extract key attributes from a full item or return key if already a key object.
- Returns: Key object suitable for DynamoDB operations

## Configuration

### AWS Configuration

The `connConfig` parameter accepts standard AWS DynamoDB client configuration:

```javascript
const config = {
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'your-access-key',
    secretAccessKey: 'your-secret-key'
  },
  endpoint: 'http://localhost:8000' // For DynamoDB Local
};
```

### Testing with DynamoDB Local

For local testing, you can use [DynamoDB Local](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html):

```bash
# Install DynamoDB Local
npm install --save-dev dynamodb-local

# Configure for local testing
const config = {
  region: 'us-east-1',
  endpoint: 'http://localhost:8000',
  credentials: {
    accessKeyId: 'fakeKey',
    secretAccessKey: 'fakeSecret'
  }
};
```

## Key Handling

The library automatically handles key extraction for both simple and composite key tables:

- **Single Key**: `{ id: 'value' }`
- **Composite Key**: `{ partitionKey: 'pk-value', sortKey: 'sk-value' }`

You can pass either full items or just keys to `remove()` and `get()` methods:

```javascript
// These are equivalent for single key tables
await fixture.remove({ id: 'user1' });
await fixture.remove({ id: 'user1', name: 'John', email: 'john@example.com' });

// These are equivalent for composite key tables  
await fixture.remove({ partitionKey: 'user#123', sortKey: 'order#001' });
await fixture.remove({ 
  partitionKey: 'user#123', 
  sortKey: 'order#001',
  amount: 99.99,
  status: 'pending'
});
```

## Development

### Building

```bash
npm run build        # Full build (ESM, CJS, TypeScript declarations)
npm run clean        # Clean build artifacts
```

### Testing

```bash
npm test             # Run all tests
npm run test:unit    # Run unit tests only
npm run test:functional  # Run functional tests only (requires DynamoDB Local)
```

### Test Coverage

```bash
npm run open:cov     # Open combined coverage report
npm run open:cov:unit      # Open unit test coverage
npm run open:cov:functional # Open functional test coverage
```

## License

ISC

## Contributing

This package follows the fixture-interface pattern for consistent test data management across different data stores. Contributions are welcome!