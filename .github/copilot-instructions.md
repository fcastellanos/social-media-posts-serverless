# GitHub Copilot / Agent Instructions — Serverless TypeScript + DynamoDB

Purpose

- Provide concise, repo-specific guidance for AI assistants (Copilot, chat agents) and contributors working on this Serverless (v4) TypeScript project.
- Focus: handler conventions, DynamoDB access patterns, testing, local dev, stages/environments, CI/CD, security, and PR review checklist.

How to use

- This file is the canonical Copilot/agent instructions for the repository. Place it at `.github/copilot-instructions.md` so GitHub and other tooling can find the guidance. For contributors, a copy can be referenced at the repo root as `copilot-instructions.md` but prefer the `.github/` location for persistence and tooling.

Quick principles

- Prefer small, focused Lambda handlers; extract business logic into `src/lib/` for testability.
- Design DynamoDB around access patterns: start with reads/queries you need and add GSIs accordingly.
- Test-first approach: unit tests for logic; integration tests only when necessary (local DynamoDB or test account).
- Small iterations: apply minimal infra changes and verify with `serverless package` before `deploy`.

Repository layout (expected)

- `src/handlers/` — Lambda entry-points (one small file each)
- `src/lib/` — reusable business logic modules
- `test/` — unit tests (Vitest)
- `serverless.yml` — infra, functions, resources, IAM roles
- `tsconfig.json`, `package.json`, `.gitignore`

TypeScript Lambda conventions

- Export signature:

```ts
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => { ... }
```

- Return well-formed HTTP responses using a helper:

```ts
export const json = (status: number, data: unknown) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});
```

- Keep handlers thin: parse and validate input, call `src/lib/*` functions, handle errors, and return responses.
- Avoid heavy work in global scope. Initialize SDK clients (DynamoDB) in module scope but avoid expensive sync work.
- Use explicit error types where possible (e.g., `BadRequestError`) to map to 4xx/5xx responses.
- Keep lines <= 100 characters.

DynamoDB access patterns & best practices

- Model by access patterns. For this app:
  - Primary table with `PK` (partition key) and `SK` (sort key)
  - `entityType` attribute + `EntityTypeIndex` GSI for listing by type

- Prefer `Query` with `KeyConditionExpression` and GSIs; avoid `Scan` in production.
- Implement pagination: accept `limit` and `nextToken` (LastEvaluatedKey) in responses.
- Use `ConditionExpression` to prevent races (e.g., conditional put for unique constraints).
- Monitor consumed capacity and use on-demand billing for variable workloads.
- Avoid hot partitions (high throughput to single PK) — shard or change key design where needed.

Security & IAM

- Grant least privilege: in `serverless.yml` restrict IAM resource ARNs to the specific table and its indexes.
- Use Secrets Manager or SSM Parameter Store for credentials/secrets. Do not hardcode secrets in `serverless.yml`.
- Use separate AWS accounts for `dev`,`staging`,`prod` or at minimum separate roles.

Testing

- Unit tests:
  - Mock `@aws-sdk/lib-dynamodb` (use Vitest or Jest mocks) for handlers.
  - Test `src/lib/*` functions without AWS mocks where possible.
- Integration tests:
  - Use DynamoDB Local (Docker) or a dedicated test account.
  - Keep integration tests separate and slower — run in CI stage after unit tests.
- Test commands:

```
npm test
```

Local development

- Use `AWS_PROFILE` and `AWS_REGION` env vars to point Serverless CLI to the correct account.
- For HTTP emulation use `serverless dev` / `serverless offline`.
- For DynamoDB local:

```bash
docker run -p 8000:8000 amazon/dynamodb-local
export DYNAMODB_ENDPOINT=http://localhost:8000
# adapt client creation in tests/dev to use endpoint when env var present
```

Packaging & build

- Use Serverless v4 built-in esbuild. Keep `serverless.yml` simple and let esbuild bundle TypeScript sources.
- If custom bundling is required, configure `build` options in `serverless.yml` (e.g., externals, minify, sourcemap).

CI/CD recommendations

- Pipeline steps:
  1. install dependencies
  2. run lint + unit tests
  3. run `serverless package` to validate infra
  4. deploy to `staging` automatically
  5. require manual approval for `prod` deploy
- Use a dedicated deploy user/role with least privilege for CI.

Observability & logging

- Log structured JSON (timestamp, level, requestId, function, stage). Use CloudWatch Log Insights for queries.
- Instrument errors and latency with custom CloudWatch metrics and enable X-Ray for tracing if needed.

PR / Code review checklist

- Do handlers validate input and return correct HTTP codes?
- Are DynamoDB operations `Query` (not `Scan`) and paginated where appropriate?
- Are IAM permissions scoped and minimal?
- Are secrets removed from code and `.gitignore` present?
- Are unit tests included & passing?

Copilot / AI guidance (how to generate code here)

- Prefer generating small functions and tests together. When adding infra, always update `serverless.yml`.
- When creating a new handler, include:
  - TypeScript handler with typed signature
  - A `json` response helper
  - Unit tests that mock DynamoDB
  - Example curl invocation in README or function docs

Example prompts to use with Copilot/agent

- "Create a TypeScript Lambda handler `src/handlers/getProperty.ts` that queries `EntityTypeIndex` for a given `propertyId` and returns 404 if missing. Add unit tests mocking DynamoDB."
- "Refactor `createPost` to validate `photos` array shape and add tests for invalid input."

Where to split instructions

- If repo grows: split into `CONTRIBUTING.md`, `DEV_GUIDE.md`, `INFRA.md` and reference them from this file.

Maintenance notes for Copilot

- When generating code, prefer small, testable functions. Suggest unit tests whenever a new helper is introduced.
- Recommend `vitest` tests and keep mocks for AWS SDK calls.
- When asked to change infra, update `serverless.yml` and ensure packaging still succeeds (esbuild config or plugin changes).

References

- Serverless Framework: https://www.serverless.com/framework/docs/
- AWS Lambda best practices: https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html
- DynamoDB best practices: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html
