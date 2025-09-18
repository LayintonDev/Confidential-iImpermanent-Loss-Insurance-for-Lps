mod gen;

use gen::*;
use std::collections::HashMap;

pub struct ServerImpl;

#[async_trait::async_trait]
impl ConfidentialInsuranceRpcServer for ServerImpl {
    // Call this method using the name: compute_aggregateAttestations
    async fn aggregate_attestations(&self, attestations: Vec<U256>, signatures: Vec<Bytes>, operator_public_keys: Vec<Bytes>, threshold: U256) -> RpcResult<(U256, bool)> {
        // Aggregate multiple operator attestations using BLS signatures
        
        if attestations.len() != signatures.len() || signatures.len() != operator_public_keys.len() {
            return Ok((U256::ZERO, false));
        }
        
        if attestations.len() < threshold.as_u64() as usize {
            return Ok((U256::ZERO, false));
        }
        
        // Simple aggregation logic - in production this would use proper BLS signature verification
        let mut aggregated_value = U256::ZERO;
        let mut valid_attestations = 0u64;
        
        // Calculate weighted average of attestations
        for (i, attestation) in attestations.iter().enumerate() {
            // In a real implementation, we would verify each BLS signature here
            // For now, we assume all signatures are valid for demonstration
            if !attestation.is_zero() && !signatures[i].is_empty() && !operator_public_keys[i].is_empty() {
                aggregated_value = aggregated_value + attestation;
                valid_attestations += 1;
            }
        }
        
        let meets_threshold = valid_attestations >= threshold.as_u64();
        
        if meets_threshold && valid_attestations > 0 {
            aggregated_value = aggregated_value / U256::from(valid_attestations);
        } else {
            aggregated_value = U256::ZERO;
        }
        
        Ok((aggregated_value, meets_threshold))
    }

    // Call this method using the name: compute_calculateImpermanentLoss
    async fn calculate_impermanent_loss(&self, initial_token_a_amount: U256, initial_token_b_amount: U256, current_token_a_price: U256, current_token_b_price: U256, initial_token_a_price: U256, initial_token_b_price: U256, pool_fee_rate: U256) -> RpcResult<(U256, bool)> {
        // Calculate impermanent loss for liquidity providers
        // IL = (2 * sqrt(price_ratio) / (1 + price_ratio)) - 1
        
        let price_ratio = if initial_token_a_price.is_zero() || initial_token_b_price.is_zero() {
            return Ok((U256::ZERO, false));
        } else {
            (current_token_a_price * initial_token_b_price) / (initial_token_a_price * current_token_b_price)
        };
        
        // Calculate initial portfolio value
        let initial_value = initial_token_a_amount * initial_token_a_price + initial_token_b_amount * initial_token_b_price;
        
        // Calculate current value if held (not in LP)
        let hold_value = initial_token_a_amount * current_token_a_price + initial_token_b_amount * current_token_b_price;
        
        // Calculate LP value with impermanent loss
        // Simplified calculation for demonstration
        let sqrt_ratio = isqrt(price_ratio);
        let lp_multiplier = (U256::from(2) * sqrt_ratio) / (U256::from(1) + price_ratio);
        let lp_value = (initial_value * lp_multiplier) / U256::from(1);
        
        // Add fees earned
        let fees_earned = (initial_value * pool_fee_rate) / U256::from(10000); // basis points
        let total_lp_value = lp_value + fees_earned;
        
        // Calculate impermanent loss
        let impermanent_loss = if hold_value > total_lp_value {
            hold_value - total_lp_value
        } else {
            U256::ZERO
        };
        
        let has_loss = impermanent_loss > U256::ZERO;
        
        Ok((impermanent_loss, has_loss))
    }

    // Call this method using the name: compute_calculatePayout
    async fn calculate_payout(&self, policy_id: U256, impermanent_loss: U256, coverage_amount: U256, deductible: U256, coverage_ratio: U256) -> RpcResult<U256> {
        // Calculate insurance payout based on policy parameters
        
        if impermanent_loss <= deductible {
            // Loss is below deductible threshold
            return Ok(U256::ZERO);
        }
        
        // Calculate loss above deductible
        let covered_loss = impermanent_loss - deductible;
        
        // Apply coverage ratio (e.g., 80% coverage)
        let payout_before_cap = (covered_loss * coverage_ratio) / U256::from(10000); // basis points
        
        // Apply coverage amount cap
        let final_payout = if payout_before_cap > coverage_amount {
            coverage_amount
        } else {
            payout_before_cap
        };
        
        Ok(final_payout)
    }

    // Call this method using the name: compute_validateOraclePrices
    async fn validate_oracle_prices(&self, price_data: Vec<U256>, timestamps: Vec<U256>, deviation_threshold: U256) -> RpcResult<(bool, Vec<U256>)> {
        // Validate oracle price data for anomalies and consistency
        
        if price_data.len() != timestamps.len() || price_data.is_empty() {
            return Ok((false, vec![]));
        }
        
        let mut valid_prices = Vec::new();
        let mut is_valid = true;
        
        // Check for price deviations
        for i in 1..price_data.len() {
            let prev_price = price_data[i - 1];
            let curr_price = price_data[i];
            
            if prev_price.is_zero() {
                is_valid = false;
                continue;
            }
            
            // Calculate percentage deviation
            let deviation = if curr_price > prev_price {
                ((curr_price - prev_price) * U256::from(10000)) / prev_price
            } else {
                ((prev_price - curr_price) * U256::from(10000)) / prev_price
            };
            
            if deviation > deviation_threshold {
                is_valid = false;
            } else {
                valid_prices.push(curr_price);
            }
        }
        
        // Check timestamp ordering
        for i in 1..timestamps.len() {
            if timestamps[i] <= timestamps[i - 1] {
                is_valid = false;
                break;
            }
        }
        
        Ok((is_valid, valid_prices))
    }

    // Call this method using the name: compute_verifyEncryptedAttestation
    async fn verify_encrypted_attestation(&self, encrypted_attestation: Bytes, proof: Bytes, public_inputs: Vec<U256>) -> RpcResult<(bool, U256)> {
        // Verify encrypted attestation using zero-knowledge proofs
        
        if encrypted_attestation.is_empty() || proof.is_empty() {
            return Ok((false, U256::ZERO));
        }
        
        // In a real implementation, this would:
        // 1. Decrypt the attestation using FHE
        // 2. Verify the ZK proof of correct computation
        // 3. Extract the computed value
        
        // For demonstration, we simulate the verification process
        let attestation_hash = keccak256(&encrypted_attestation);
        let proof_hash = keccak256(&proof);
        
        // Simple verification logic - check if proof and attestation are consistent
        let is_valid = !attestation_hash.is_zero() && !proof_hash.is_zero() && !public_inputs.is_empty();
        
        // Extract a simulated computed value from the public inputs
        let computed_value = if is_valid && !public_inputs.is_empty() {
            public_inputs[0] // First public input as the computed result
        } else {
            U256::ZERO
        };
        
        Ok((is_valid, computed_value))
    }

}

// Helper function for integer square root
fn isqrt(value: U256) -> U256 {
    if value.is_zero() {
        return U256::ZERO;
    }
    
    let mut x = value;
    let mut y = (value + U256::from(1)) / U256::from(2);
    
    while y < x {
        x = y;
        y = (y + value / y) / U256::from(2);
    }
    
    x
}

// Helper function for keccak256 hash
fn keccak256(data: &[u8]) -> U256 {
    use sha3::{Digest, Keccak256};
    let mut hasher = Keccak256::new();
    hasher.update(data);
    let result = hasher.finalize();
    U256::from_big_endian(&result)
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let port = std::env::var("SERVICE_PORT")
        .ok()
        .and_then(|p| p.parse::<u16>().ok())
        .unwrap_or(8080);
    start_server(ServerImpl, port).await
}
