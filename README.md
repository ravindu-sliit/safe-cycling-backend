# safe-cycling-backend

## Testing Instruction Report

This report outlines the testing architecture, environment configuration, and execution instructions for the Safe Cycling backend.

### 1. Environment Configuration

To keep test runs isolated, deterministic, and safe for real data, the backend testing environment is configured as follows:

- In-memory database: `mongodb-memory-server` is used to create a temporary MongoDB instance in RAM for each test suite.
- API mocking: external OpenRouteService calls in route creation tests are mocked via `jest.mock('axios')`.
- Test runtime mode: tests run with `process.env.NODE_ENV = 'test'`, and the app import path is configured so `src/server.js` does not auto-connect to production DB or auto-listen on a network port during tests.
- Sequential execution safety: Jest runs with `--runInBand --testTimeout=60000 --detectOpenHandles` to improve test stability and help detect hanging resources.

### 2. Unit and Integration Testing (Jest + Supertest)

Jest is used as the test runner and Supertest is used to execute HTTP requests directly against the Express app instance.

Implemented test suites:

- `tests/routes.test.js`
- `tests/hazardRoutes.test.js`
- `tests/reviewRoutes.test.js`
- `tests/userRoutes.test.js`

Covered scenarios include both success and negative paths:

- Routes API:
	- `POST /api/routes` with mocked ORS response and admin JWT
	- `GET /api/routes`
	- `DELETE /api/routes/:id`
	- unauthorized and forbidden deletion cases
- Hazards API:
	- `POST /api/hazards` with authenticated user
	- `GET /api/hazards` (public)
	- unauthorized creation and forbidden deletion cases
- Reviews API:
	- `POST /api/reviews` (user)
	- `GET /api/reviews/route/:routeId` (public)
	- `POST /api/reviews/:id/vote` (authenticated user upvote/downvote)
	- duplicate review conflict handling
	- `GET /api/reviews` access control (admin-only)
- Users API:
	- `GET /api/users/me`
	- `GET /api/users` (admin-only)
	- forbidden access checks for non-admin and cross-user profile read

How to execute integration tests:

1. Open a terminal in the backend root directory.
2. Install dependencies (if needed):

```bash
npm install
```

3. Run all tests:

```bash
npm test
```

4. Optional watch mode:

```bash
npm run test:watch
```

### 3. Performance Testing (Artillery)

Artillery is used to evaluate API behavior under simulated traffic.

Load profile file:

- `load-test.yml`

Current mixed read-traffic scenarios:

- `GET /`
- `GET /api/routes`
- `GET /api/hazards`
- `GET /api/reviews/route/:routeId` (placeholder ObjectId used to exercise route handling path)

How to execute performance tests:

1. Open terminal 1 in the backend root and start the API:

```bash
npm start
```

2. Open terminal 2 in the same directory and run load test:

```bash
npm run load:test
```

3. Review the Artillery summary for:

- total requests
- successful responses
- errors/timeouts
- latency statistics (mean, p95, p99)

Latest executed mixed-load run summary:

- Total requests: 1126
- HTTP 200 responses: 847
- Timeout errors (`ETIMEDOUT`): 279
- Mean response time: 2634.6 ms
- p95 response time: 9230.4 ms
- p99 response time: 9801.2 ms

This indicates the API is functional under load but experiences significant timeout pressure at the current sustained traffic profile.