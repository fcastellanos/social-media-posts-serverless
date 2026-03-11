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

Local setup

1. Install AWS CLI (if not already installed)

```bash
# macOS (Homebrew)
brew install awscli

# verify
aws --version
```

2. Configure AWS credentials (recommended: use a named profile)

```bash
aws configure --profile myprofile
# follow prompts to enter AWS Access Key ID, Secret Access Key, region (e.g. us-east-1)
```

Or create `~/.aws/credentials` with:

```
[myprofile]
aws_access_key_id = AKIA...YOURKEY
aws_secret_access_key = YOUR_SECRET
```

3. Point Serverless / local tools at the profile (example using environment variable):

```bash
export AWS_PROFILE=myprofile
export AWS_REGION=us-east-1
```

4. Optional: local DynamoDB for integration testing

You can run DynamoDB Local via Docker:

```bash
docker run -p 8000:8000 amazon/dynamodb-local
```

Then set the `ENDPOINT` environment variable and update handlers to connect to `http://localhost:8000` for local testing, or run `serverless offline` which can emulate API Gateway but requires additional plugin configuration for local DynamoDB wiring.

5. Helpful commands

```bash
# install deps
npm install

# run unit tests
npm test

# start local dev (serverless offline)
npm run start

# package (build artifacts)
serverless package

# deploy to AWS (uses current AWS_PROFILE/AWS_REGION)
serverless deploy
```

Security

- Avoid committing credentials or `.env` files. A `.gitignore` has been added.
- If a secret is accidentally committed, rotate it immediately and remove it from git history (e.g., `git filter-repo` or `bfg`).
