FROM rust:1.87-alpine AS builder

# Install build dependencies
RUN apk add --no-cache musl-dev pkgconfig openssl-dev

# Add the x86_64 target for cross-compilation
RUN rustup target add x86_64-unknown-linux-musl

WORKDIR /app
COPY Cargo.toml ./
COPY src/ ./src/
COPY *.json ./

# Always build for x86_64/amd64
RUN cargo build --release --target x86_64-unknown-linux-musl && \
    strip target/x86_64-unknown-linux-musl/release/confidentialinsurance-server

# Ultra-small runtime
FROM --platform=linux/amd64 alpine:3.20
RUN apk add --no-cache ca-certificates && \
    adduser -D -u 1000 appuser

WORKDIR /app
COPY --from=builder --chown=appuser:appuser /app/target/x86_64-unknown-linux-musl/release/confidentialinsurance-server /app/*.json ./

USER appuser
CMD ["./confidentialinsurance-server"]
