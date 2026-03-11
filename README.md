# aws-node-http-api-project

This project is a Serverless Framework (v4) Node.js HTTP API for AWS using TypeScript Lambda handlers and DynamoDB for persistence.

Summary

- Four API endpoints implemented as AWS Lambda functions (TypeScript):
  - POST /properties — create a Property (description is optional)
  - GET /properties — list Properties (queries a GSI)
  - POST /posts — create a Social Media Post (can reference a property, include photos)
  - GET /posts — list Posts (queries a GSI)
- Single DynamoDB table: `${self:service}-properties-table` with a Global Secondary Index `EntityTypeIndex` on `entityType` + `SK` for efficient listing.
- Responses include `Content-Type: application/json` so API Gateway returns JSON.

Repository layout

- `src/handlers/` — TypeScript Lambda handlers
- `test/` — Vitest unit tests (handlers are unit-tested with DynamoDB mocked)
- `serverless.yml` — Serverless config, resources and IAM role statements
- `tsconfig.json` — TypeScript config
- `package.json` — scripts and dependencies

Quick start

1. Install dependencies:

```bash
npm install
```

2. Run tests:

```bash
npm test
```

3. Local development (Serverless Offline):

```bash
npm run start
```

4. Package or deploy (uses Serverless v4 built-in esbuild):

```bash
# package (build artifacts)
serverless package

# deploy to AWS
serverless deploy
```

Notes

- DynamoDB table: created by the CloudFormation template in `serverless.yml`. The table name is `${self:service}-properties-table`. The `PROPERTIES_TABLE_NAME` environment variable is set for Lambdas.
- Tests: unit tests mock `@aws-sdk/lib-dynamodb` and run with Vitest. See `test/` for examples.
- Request validation: handlers perform simple required-field checks. `description` on properties is optional.
