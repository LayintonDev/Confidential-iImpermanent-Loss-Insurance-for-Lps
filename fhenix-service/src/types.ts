import { z } from "zod";

// Request schemas
export const ComputeClaimRequestSchema = z.object({
  policyId: z.number().int().positive(),
  entryCommit: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid hex string"),
  exitCommit: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid hex string"),
  publicRefs: z.object({
    twapRoot: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid TWAP root"),
    pool: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid pool address"),
  }),
});

// Response schemas
export const ComputeClaimResponseSchema = z.object({
  policyId: z.number().int().positive(),
  payout: z.string(),
  auditHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid audit hash"),
  fhenixSignature: z.string().regex(/^0x[a-fA-F0-9]+$/, "Invalid signature"),
  workerId: z.string(),
});

// Error response schema
export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  timestamp: z.string(),
});

// Health check response
export const HealthResponseSchema = z.object({
  status: z.enum(["healthy", "unhealthy"]),
  timestamp: z.string(),
  workerId: z.string(),
  version: z.string(),
});

// Types derived from schemas
export type ComputeClaimRequest = z.infer<typeof ComputeClaimRequestSchema>;
export type ComputeClaimResponse = z.infer<typeof ComputeClaimResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
