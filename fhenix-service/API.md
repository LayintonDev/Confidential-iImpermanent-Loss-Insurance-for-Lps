# Fhenix Service API Documentation

## Overview

The Fhenix Service is a mock FHE (Fully Homomorphic Encryption) computation service that simulates confidential impermanent loss calculations for the IL insurance system. In production, this would be replaced with actual Fhenix FHE computation.

**Base URL**: `http://localhost:3001`  
**Content-Type**: `application/json`  
**Version**: `1.0.0`

---

## Endpoints

### 1. Health Check

**GET** `/api/status`

Returns the current health status of the Fhenix service.

**Response:**

```json
{
  "status": "healthy",
  "service": "fhenix-mock",
  "timestamp": "2025-09-14T18:00:00.000Z",
  "workerId": "worker-1",
  "version": "1.0.0"
}
```

**Status Codes:**

- `200` - Service is healthy

---

### 2. Worker Information

**GET** `/api/worker-info`

Returns information about the Fhenix worker.

**Response:**

```json
{
  "workerId": "worker-1",
  "publicKey": "0x04111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111",
  "signerAddress": "0x12eFfC9ce9b62b482C663a30abA838f8223cEA12",
  "capabilities": ["impermanent-loss-calculation", "confidential-computation", "attestation-generation"],
  "status": "active",
  "version": "1.0.0"
}
```

**Status Codes:**

- `200` - Worker information retrieved successfully

---

### 3. Compute Claim (Main Endpoint)

**POST** `/api/compute-claim`

Processes an impermanent loss calculation request for a policy claim.

**Request Body:**

```json
{
  "policyId": 1,
  "entryCommit": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "exitCommit": "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
  "publicRefs": {
    "twapRoot": "0x0000000000000000000000000000000000000000000000000000000000000000",
    "pool": "0x1111111111111111111111111111111111111111"
  }
}
```

**Request Schema:**

- `policyId` (number): Positive integer representing the policy ID
- `entryCommit` (string): 64-character hex string representing the entry commitment hash
- `exitCommit` (string): 64-character hex string representing the exit commitment hash
- `publicRefs.twapRoot` (string): 64-character hex string for TWAP data root
- `publicRefs.pool` (string): 40-character hex string for pool address

**Success Response:**

```json
{
  "policyId": 1,
  "payout": "1789571206250",
  "auditHash": "0x74d0931e549e0ca35f143aea9df91ec2ed8414a3976983f358657564d4391eab",
  "fhenixSignature": "0x94f9418407d68a795e89e5b1b5a26303b934b80e4c6fa473f9de594923523e9c055a77d50d07a16510c99d6a3e214b847bca7114b736015482de11e5f8f2317c1c",
  "workerId": "worker-1"
}
```

**Response Schema:**

- `policyId` (number): The same policy ID from the request
- `payout` (string): Calculated payout amount as string
- `auditHash` (string): Hash of the computation for verification
- `fhenixSignature` (string): ECDSA signature of the attestation
- `workerId` (string): Identifier of the worker that processed the request

**Error Response:**

```json
{
  "error": "Validation Error",
  "message": "Invalid request format: policyId must be a positive number",
  "timestamp": "2025-09-14T18:00:00.000Z"
}
```

**Status Codes:**

- `200` - Computation successful
- `400` - Invalid request format or validation error
- `500` - Internal server error

---

## Authentication

Currently, no authentication is required for the mock service. In production, this would include:

- API key authentication
- Worker authorization tokens
- Request signing verification

---

## Rate Limiting

The mock service has no rate limiting. Production implementation would include:

- Request rate limits per worker
- Concurrent request management
- Queue management for high load

---

## Error Handling

### Validation Errors (400)

Returned when request format is invalid:

```json
{
  "error": "Validation Error",
  "message": "Invalid hex string format for entryCommit",
  "timestamp": "2025-09-14T18:00:00.000Z"
}
```

### Server Errors (500)

Returned when internal processing fails:

```json
{
  "error": "Internal Server Error",
  "message": "Computation failed due to invalid commitment data",
  "timestamp": "2025-09-14T18:00:00.000Z"
}
```

### Not Found (404)

Returned for unknown endpoints:

```json
{
  "error": "Not Found",
  "message": "Route /api/unknown-endpoint not found",
  "timestamp": "2025-09-14T18:00:00.000Z"
}
```

---

## Example Usage

### JavaScript/TypeScript

```typescript
import axios from "axios";

const fhenixService = "http://localhost:3001";

// Check service health
const health = await axios.get(`${fhenixService}/api/status`);
console.log("Service status:", health.data.status);

// Submit computation request
const request = {
  policyId: 1,
  entryCommit: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  exitCommit: "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
  publicRefs: {
    twapRoot: "0x0000000000000000000000000000000000000000000000000000000000000000",
    pool: "0x1111111111111111111111111111111111111111",
  },
};

const response = await axios.post(`${fhenixService}/api/compute-claim`, request);
console.log("Payout calculated:", response.data.payout);
console.log("Audit hash:", response.data.auditHash);
console.log("Signature:", response.data.fhenixSignature);
```

### cURL

```bash
# Health check
curl -X GET http://localhost:3001/api/status

# Worker info
curl -X GET http://localhost:3001/api/worker-info

# Compute claim
curl -X POST http://localhost:3001/api/compute-claim \
  -H "Content-Type: application/json" \
  -d '{
    "policyId": 1,
    "entryCommit": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "exitCommit": "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
    "publicRefs": {
      "twapRoot": "0x0000000000000000000000000000000000000000000000000000000000000000",
      "pool": "0x1111111111111111111111111111111111111111"
    }
  }'
```

---

## Mock Implementation Details

### IL Calculation Logic

The mock service simulates FHE computation by:

1. **Extracting mock data** from commitment hashes using deterministic algorithms
2. **Calculating hodl value**: `V_hodl = x0 * P1 + y0`
3. **Calculating LP value**: `V_lp = x1 * P1 + y1 + fees`
4. **Computing IL**: `IL = max(0, V_hodl - V_lp)`
5. **Applying insurance parameters**: Deductible and cap calculations
6. **Generating audit hash** for verification
7. **Signing attestation** with ECDSA

### Signature Generation

```typescript
// Message to sign
const messageData = { policyId, payout, auditHash, workerId };
const message = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(messageData)));

// ECDSA signature (ethers v6)
const signature = await wallet.signMessage(ethers.getBytes(message));
```

### Audit Hash Generation

```typescript
const auditHash = ethers.keccak256(ethers.toUtf8Bytes(`${entryCommit}${exitCommit}${twapRoot}${payout}`));
```

---

## Environment Configuration

### Environment Variables

```bash
# Server configuration
PORT=3001
NODE_ENV=development

# Worker configuration
FHENIX_WORKER_ID=worker-1
FHENIX_PRIVATE_KEY=0x...

# CORS configuration
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=info
```

### Docker Support

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

---

## Monitoring & Logging

### Request Logging

All requests are logged with:

- Request method and path
- Response status code
- Response time
- Client IP address
- Request/response sizes

### Application Logging

```
🔄 Processing claim for policy 1
📊 Entry commit: 0x1234...
📊 Exit commit: 0xfedc...
🏊 Pool: 0x1111...
💰 Calculated payout: 1789571206250
🔍 Audit hash: 0x74d0...
✍️ Signature: 0x94f9...
🏷️ Signer address: 0x12eF...
✅ Claim processed successfully for policy 1
```

### Error Logging

```
❌ Error processing claim: Invalid commitment format
❌ Validation failed: policyId must be positive
❌ Signature generation failed: Invalid private key
```

---

## Development & Testing

### Starting the Service

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm start

# With custom environment
PORT=3002 FHENIX_WORKER_ID=worker-2 npm start
```

### Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- api.test.ts

# Run tests with coverage
npm run test:coverage
```

### API Testing with Jest

```typescript
import request from "supertest";
import { createApp } from "../src/index";

const app = createApp();

describe("Fhenix Service API", () => {
  test("should compute claim with valid input", async () => {
    const response = await request(app)
      .post("/api/compute-claim")
      .send({
        policyId: 1,
        entryCommit: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        exitCommit: "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
        publicRefs: {
          twapRoot: "0x0000000000000000000000000000000000000000000000000000000000000000",
          pool: "0x1111111111111111111111111111111111111111",
        },
      })
      .expect(200);

    expect(response.body).toHaveProperty("policyId", 1);
    expect(response.body).toHaveProperty("payout");
    expect(response.body).toHaveProperty("auditHash");
    expect(response.body).toHaveProperty("fhenixSignature");
    expect(response.body).toHaveProperty("workerId");
  });
});
```

---

## Production Considerations

### Security

- **Input Validation**: All inputs validated with Zod schemas
- **CORS Protection**: Configurable origin restrictions
- **Helmet Security**: Security headers for HTTP requests
- **Rate Limiting**: Would need implementation for production
- **Authentication**: Would require API keys or tokens

### Performance

- **Async Processing**: Non-blocking computation handling
- **Connection Pooling**: For database connections (if added)
- **Caching**: Response caching for repeated requests
- **Load Balancing**: Multiple worker instances

### Monitoring

- **Health Checks**: Kubernetes/Docker health endpoints
- **Metrics**: Prometheus metrics for monitoring
- **Logging**: Structured logging with correlation IDs
- **Alerting**: Error rate and performance monitoring

### Deployment

- **Container Support**: Docker and Kubernetes ready
- **Environment Management**: Configuration via environment variables
- **Graceful Shutdown**: Proper connection cleanup
- **Zero-Downtime Deployment**: Rolling updates support

---

**Documentation Version**: 1.0.0  
**Last Updated**: September 14, 2025  
**Service Version**: 1.0.0  
**API Stability**: Stable for Phase 4 requirements
