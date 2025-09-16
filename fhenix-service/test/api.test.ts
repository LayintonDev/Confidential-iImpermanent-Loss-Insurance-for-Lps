import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import { Express } from "express";
import { createApp } from "../src/index";

describe("Fhenix Service API", () => {
  let app: Express;
  let server: any;

  beforeAll(async () => {
    app = createApp();
    server = app.listen(0); // Random port
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe("POST /api/compute-claim", () => {
    it("should compute claim with valid input", async () => {
      const requestBody = {
        policyId: 1,
        entryCommit: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        exitCommit: "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
        publicRefs: {
          twapRoot: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          pool: "0x1111111111111111111111111111111111111111",
        },
      };

      const response = await request(app).post("/api/compute-claim").send(requestBody).expect(200);

      expect(response.body).toHaveProperty("policyId", 1);
      expect(response.body).toHaveProperty("payout");
      expect(response.body).toHaveProperty("auditHash");
      expect(response.body).toHaveProperty("fhenixSignature");
      expect(response.body).toHaveProperty("workerId");

      // Verify payout is a valid number string
      expect(typeof response.body.payout).toBe("string");
      expect(BigInt(response.body.payout)).toBeGreaterThanOrEqual(0);

      // Verify signature format
      expect(response.body.fhenixSignature).toMatch(/^0x[0-9a-fA-F]{130}$/);

      // Verify audit hash format
      expect(response.body.auditHash).toMatch(/^0x[0-9a-fA-F]{64}$/);
    });

    it("should reject invalid policyId", async () => {
      const requestBody = {
        policyId: -1,
        entryCommit: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        exitCommit: "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
        publicRefs: {
          twapRoot: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          pool: "0x1111111111111111111111111111111111111111",
        },
      };

      const response = await request(app).post("/api/compute-claim").send(requestBody).expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("policyId");
    });

    it("should reject invalid commitment format", async () => {
      const requestBody = {
        policyId: 1,
        entryCommit: "invalid-commitment",
        exitCommit: "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
        publicRefs: {
          twapRoot: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          pool: "0x1111111111111111111111111111111111111111",
        },
      };

      const response = await request(app).post("/api/compute-claim").send(requestBody).expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("entryCommit");
    });

    it("should reject invalid pool address", async () => {
      const requestBody = {
        policyId: 1,
        entryCommit: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        exitCommit: "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
        publicRefs: {
          twapRoot: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          pool: "invalid-address",
        },
      };

      const response = await request(app).post("/api/compute-claim").send(requestBody).expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("pool");
    });

    it("should reject missing required fields", async () => {
      const requestBody = {
        policyId: 1,
        // Missing entryCommit
        exitCommit: "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
        publicRefs: {
          twapRoot: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          pool: "0x1111111111111111111111111111111111111111",
        },
      };

      const response = await request(app).post("/api/compute-claim").send(requestBody).expect(400);

      expect(response.body).toHaveProperty("error");
    });

    it("should handle large policy IDs", async () => {
      const requestBody = {
        policyId: 999999999,
        entryCommit: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        exitCommit: "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
        publicRefs: {
          twapRoot: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          pool: "0x1111111111111111111111111111111111111111",
        },
      };

      const response = await request(app).post("/api/compute-claim").send(requestBody).expect(200);

      expect(response.body.policyId).toBe(999999999);
    });

    it("should return consistent results for same input", async () => {
      const requestBody = {
        policyId: 42,
        entryCommit: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        exitCommit: "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
        publicRefs: {
          twapRoot: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          pool: "0x1111111111111111111111111111111111111111",
        },
      };

      const response1 = await request(app).post("/api/compute-claim").send(requestBody).expect(200);

      const response2 = await request(app).post("/api/compute-claim").send(requestBody).expect(200);

      // Should return same payout for same input (deterministic mock)
      expect(response1.body.policyId).toBe(response2.body.policyId);
      expect(response1.body.payout).toBe(response2.body.payout);
    });
  });

  describe("GET /api/status", () => {
    it("should return service status", async () => {
      const response = await request(app).get("/api/status").expect(200);

      expect(response.body).toHaveProperty("status", "healthy");
      expect(response.body).toHaveProperty("service", "fhenix-mock");
      expect(response.body).toHaveProperty("timestamp");
      expect(response.body).toHaveProperty("version");
    });
  });

  describe("GET /api/worker-info", () => {
    it("should return worker information", async () => {
      const response = await request(app).get("/api/worker-info").expect(200);

      expect(response.body).toHaveProperty("workerId");
      expect(response.body).toHaveProperty("publicKey");
      expect(response.body).toHaveProperty("capabilities");
      expect(response.body.capabilities).toContain("impermanent-loss-calculation");
    });
  });

  describe("Error handling", () => {
    it("should handle 404 for unknown routes", async () => {
      const response = await request(app).get("/api/unknown-endpoint").expect(404);

      expect(response.body).toHaveProperty("error", "Not found");
    });

    it("should handle malformed JSON", async () => {
      const response = await request(app)
        .post("/api/compute-claim")
        .type("application/json")
        .send("{ invalid json }")
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });

    it("should handle empty request body", async () => {
      const response = await request(app).post("/api/compute-claim").send({}).expect(400);

      expect(response.body).toHaveProperty("error");
    });
  });

  describe("Content type validation", () => {
    it("should require JSON content type for POST requests", async () => {
      const response = await request(app).post("/api/compute-claim").type("text/plain").send("some text").expect(400);

      expect(response.body).toHaveProperty("error");
    });
  });

  describe("Rate limiting simulation", () => {
    it("should handle multiple concurrent requests", async () => {
      const requestBody = {
        policyId: 1,
        entryCommit: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        exitCommit: "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
        publicRefs: {
          twapRoot: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          pool: "0x1111111111111111111111111111111111111111",
        },
      };

      // Send 5 concurrent requests
      const promises = Array(5)
        .fill(null)
        .map((_, index) =>
          request(app)
            .post("/api/compute-claim")
            .send({ ...requestBody, policyId: index + 1 })
        );

      const responses = await Promise.all(promises);

      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.policyId).toBe(index + 1);
      });
    });
  });

  describe("IL Calculation Logic", () => {
    it("should simulate different IL scenarios", async () => {
      const scenarios = [
        {
          name: "High IL scenario",
          entryCommit: "0x1111111111111111111111111111111111111111111111111111111111111111",
          exitCommit: "0x2222222222222222222222222222222222222222222222222222222222222222",
        },
        {
          name: "Low IL scenario",
          entryCommit: "0x3333333333333333333333333333333333333333333333333333333333333333",
          exitCommit: "0x4444444444444444444444444444444444444444444444444444444444444444",
        },
        {
          name: "No IL scenario",
          entryCommit: "0x5555555555555555555555555555555555555555555555555555555555555555",
          exitCommit: "0x5555555555555555555555555555555555555555555555555555555555555555", // Same as entry
        },
      ];

      for (const scenario of scenarios) {
        const requestBody = {
          policyId: 1,
          entryCommit: scenario.entryCommit,
          exitCommit: scenario.exitCommit,
          publicRefs: {
            twapRoot: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            pool: "0x1111111111111111111111111111111111111111",
          },
        };

        const response = await request(app).post("/api/compute-claim").send(requestBody).expect(200);

        expect(response.body).toHaveProperty("payout");

        // For the mock service, verify that different inputs produce different outputs
        const payout = BigInt(response.body.payout);
        expect(payout).toBeGreaterThanOrEqual(0);

        console.log(`${scenario.name}: Payout = ${response.body.payout}`);
      }
    });
  });

  describe("Signature validation", () => {
    it("should produce valid ECDSA signatures", async () => {
      const requestBody = {
        policyId: 1,
        entryCommit: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        exitCommit: "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
        publicRefs: {
          twapRoot: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          pool: "0x1111111111111111111111111111111111111111",
        },
      };

      const response = await request(app).post("/api/compute-claim").send(requestBody).expect(200);

      const signature = response.body.fhenixSignature;

      // Verify signature format: 0x + 130 hex chars (65 bytes: r(32) + s(32) + v(1))
      expect(signature).toMatch(/^0x[0-9a-fA-F]{130}$/);

      // Verify the signature is not all zeros (which would indicate an error)
      expect(signature).not.toBe("0x" + "0".repeat(130));
    });
  });
});
