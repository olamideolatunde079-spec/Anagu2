# Anagu — Land Administration Framework
## Complete Project Reference, Build Guide, and Spec

> **System:** An integrated Blockchain–GIS–NFT–Community Verification Oracle–MQTT framework
> for land title registration, verification, and lawful revocation under Nigeria's Land Use Act (1978).
>
> This document is the single source of truth. Everything needed to understand, build, test, and
> evaluate the system is written inline here — no external chapters to cross-check.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Technology Stack](#3-technology-stack)
4. [Repository Structure](#4-repository-structure)
5. [Development Philosophy](#5-development-philosophy)
6. [Build Order Summary](#6-build-order-summary)
7. [Environment and Repository Setup (Step 0)](#7-environment-and-repository-setup-step-0)
8. [Component 1 — GIS-Based Spatial Verification](#8-component-1--gis-based-spatial-verification-objective-i)
9. [Component 2 — Blockchain NFT Tokenisation and Statutory Revocation](#9-component-2--blockchain-nft-tokenisation-and-statutory-revocation-objective-ii)
   - [Part A — Smart Contract Execution](#part-a--smart-contract-execution-issuingupdating-records)
   - [Part B — NFT Title Issuance](#part-b--nft-title-issuance)
   - [Part C — Statutory Revocation](#part-c--statutory-revocation)
10. [Component 3 — Community Verification Oracle and MQTT](#10-component-3--community-verification-oracle-and-mqtt-communication-objective-iii)
    - [Part A — Ownership Verification Oracle](#part-a--ownership-verification-the-oracle)
    - [Part B — MQTT Communication and Synchronisation](#part-b--mqtt-communication-and-synchronisation)
11. [Integration — Unified Registration Workflow](#11-integration--unified-registration-workflow)
12. [Component 4 — Cross-Cutting Evaluation](#12-component-4--cross-cutting-evaluation-objective-iv)
    - [Conventional Baseline Definition](#define-the-conventional-baseline-first)
    - [Part A — Fraud and Tampering Scenarios](#part-a--fraud-and-tampering-scenarios)
    - [Part B — Processing Latency (5-Stage Timing)](#part-b--processing-latency-5-stage-timing)
    - [Part C — Storage Overhead](#part-c--storage-overhead)
13. [Role-Based Access Control Matrix](#13-role-based-access-control-matrix)
14. [Smart Contract Reference](#14-smart-contract-reference)
15. [API Reference (NestJS Backend)](#15-api-reference-nestjs-backend)
16. [Database Schema (PostgreSQL + PostGIS)](#16-database-schema-postgresql--postgis)
17. [MQTT Topic and Payload Schema](#17-mqtt-topic-and-payload-schema)
18. [Results Tables (To Be Filled with Real Data)](#18-results-tables-to-be-filled-with-real-data)
19. [Checklist — 100% Completion Gate](#19-checklist--100-completion-gate)
20. [Glossary](#20-glossary)

---

## 1. Project Overview

Anagu digitises land title registration and revocation in a way that is legally compliant with
Nigerian statute, fraud-resistant, spatially accurate, and resilient to poor connectivity. It
replaces paper-based, manual registry processes with a pipeline that integrates:

- **GIS polygon validation** — geometry correctness and boundary overlap detection
- **Blockchain immutability** — every title issuance, transfer, and revocation is an on-chain event
- **NFT tokenisation** — each registered parcel is a unique ERC-721 token, not a mutable database row
- **Statutory revocation** — only a Governor-role address can revoke a title, on two specific grounds (overriding public interest; breach of statutory condition), as required by Land Use Act 1978 §28
- **Community/institutional oracle** — ownership is cross-checked against authorised sources before anything reaches the chain
- **MQTT messaging** — real-time event propagation to web, mobile, and backend; offline-queue support for low-connectivity field conditions

### Four Objectives

| Objective | Component | Description |
|-----------|-----------|-------------|
| i | Component 1 | GIS-based spatial parcel verification |
| ii | Component 2 | Blockchain NFT tokenisation and statutory revocation |
| iii | Component 3 | Community verification oracle + MQTT communication |
| iv | Component 4 | Cross-cutting security, fraud, latency, and storage evaluation |

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Client Layer                                 │
│   ┌─────────────────────┐       ┌──────────────────────────────┐   │
│   │   Next.js Web App   │       │  React Native / Expo Mobile  │   │
│   └──────────┬──────────┘       └───────────────┬──────────────┘   │
└──────────────┼───────────────────────────────────┼──────────────────┘
               │ HTTPS / WebSocket                 │ HTTPS / MQTT
┌──────────────▼───────────────────────────────────▼──────────────────┐
│                        Backend Layer (NestJS)                        │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐  │
│  │  GIS Module │ │Oracle Module │ │Blockchain Svc│ │ MQTT Svc   │  │
│  │ (Component1)│ │(Component3A) │ │(Component2)  │ │(Component3B│  │
│  └──────┬──────┘ └──────┬───────┘ └──────┬───────┘ └─────┬──────┘  │
└─────────┼───────────────┼────────────────┼───────────────┼──────────┘
          │               │                │               │
    ┌─────▼─────┐  ┌──────▼──────┐  ┌─────▼──────┐  ┌────▼──────┐
    │ PostgreSQL│  │  Redis Cache │  │Hyperledger │  │   EMQX    │
    │ + PostGIS │  │              │  │   Besu     │  │   MQTT    │
    └─────┬─────┘  └─────────────┘  │  (QBFT)    │  │  Broker   │
          │                         └─────┬──────┘  └───────────┘
    ┌─────▼──────────────────────────┐    │
    │         MinIO (Object Storage)  │    │  Smart Contracts
    │     (land documents / files)   │    │  LandTitleNFT.sol
    └─────────────────────────────── ┘    │  LandRegistry.sol
                                          └─────────────────
```

### End-to-End Registration Sequence

```
Application Submission
        │
        ▼
[1] Spatial Verification (Component 1)
        │  PostGIS ST_IsValid() + ST_Intersects()
        │  Reject → return diagnostic feedback
        ▼
[2] Community Attestation / Ownership Verification (Component 3A)
        │  Oracle cross-checks institutional + community sources
        │  Reject → administrative review queue
        ▼
[3] Legal Verification
        │
        ▼
[4] Registrar Approval
        │
        ▼
[5] Blockchain Registration (Component 2A)
        │  Smart contract validates business rules + records on Besu
        ▼
[6] NFT Title Issuance (Component 2B)
        │  ERC-721 minted, linked to parcel + ownership record
        ▼
[7] MQTT Notification (Component 3B)
        │  All subscribed clients notified in real time
        ▼
        ✓ Title Issued
```

---

## 3. Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Web Frontend | Next.js | React-based, SSR/SSG |
| Mobile Frontend | React Native via Expo | Offline queue for low connectivity |
| Backend | NestJS (Node.js / TypeScript) | Modular architecture |
| Database | PostgreSQL 15 + PostGIS 3 | Spatial queries; EPSG:4326 (WGS 84) |
| Blockchain | Hyperledger Besu | Permissioned; PoA-QBFT-DPoS |
| Smart Contracts | Solidity + Hardhat | ERC-721 via OpenZeppelin |
| Messaging | MQTT — EMQX or Eclipse Mosquitto | QoS 1; offline queue support |
| Cache / Queues | Redis | Session cache, job queues |
| Object Storage | MinIO | Land documents, survey scans |
| Containerisation | Docker Compose | All services orchestrated |
| Version Control | Git | Monorepo |
23
### Blockchain Consensus Configuration

**Mechanism:** Hybrid PoA–QBFT–DPoS (Proof-of-Authority + Quorum Byzantine Fault Tolerance + Delegated Proof-of-Stake)

**Why this combination:**
- Standard Proof-of-Work was **rejected** — computational overhead and probabilistic finality
  don't suit a permissioned, institutionally governed context where validator identity is already known.
- Standard unweighted PoA was **rejected** — it doesn't support the reputation-based,
  statutory-role differentiation needed (specifically, restricting the revocation function to
  one authorised role).
- **QBFT** gives deterministic finality suited to statutory transactions.
- **DPoS component** allows validator weighting to reflect institutional role.

**Besu parameters:**
```
QBFT block period:  1 second
Epoch length:       30,000 blocks
```

---

## 4. Repository Structure

```
monorepo/
├── apps/
│   ├── web/                    # Next.js — citizen/registrar portal
│   ├── mobile/                 # React Native (Expo) — field mobile app
│   └── backend/                # NestJS — core API and services
│       ├── src/
│       │   ├── gis/            # Component 1: spatial verification module
│       │   ├── blockchain/     # Component 2: Besu/Hardhat integration service
│       │   ├── oracle/         # Component 3A: ownership verification oracle
│       │   ├── mqtt/           # Component 3B: MQTT publisher/subscriber
│       │   ├── auth/           # JWT + RBAC (citizen, surveyor, registrar, admin, governor)
│       │   ├── parcels/        # Parcel entity, CRUD, workflow state machine
│       │   ├── documents/      # MinIO integration for land documents
│       │   └── audit/          # Immutable audit trail (every state transition)
├── contracts/
│   ├── contracts/
│   │   ├── LandTitleNFT.sol    # ERC-721 + AccessControl + revocation
│   │   └── LandRegistry.sol    # Issuance + registry-controlled transfers
│   ├── scripts/
│   │   ├── deploy.ts
│   │   └── seed.ts
│   ├── test/
│   │   ├── LandTitleNFT.test.ts
│   │   └── LandRegistry.test.ts
│   └── hardhat.config.ts
├── infra/
│   └── besu/
│       ├── genesis.json        # QBFT genesis (1s block period, 30000 epoch)
│       ├── config.toml
│       └── node-keys/
├── docker-compose.yml
├── docker-compose.override.yml  # local dev overrides
├── .env.example
└── PROJECT.md                  # ← you are here
```

---

## 5. Development Philosophy

Four rules govern the build order — violating any one of them turns debugging into guesswork:

1. **One component, one phase, one validation gate.**
   Don't start building the next component until the current one passes its own isolated test.
   Don't debug a fully-wired system with five unknowns at once.

2. **Every component gets its success criteria defined before it's built.**
   The results tables in Section 18 are defined now, before any code is written — that's the
   point. If you can't fill in a table cell, the component isn't done.

3. **The step-by-step procedures in this document are the spec, not a suggestion.**
   Implement them in the stated order.

4. **Cross-cutting evaluation (security, fraud resistance, storage, latency) happens
   once, last, across the whole integrated system** — never mixed into an individual
   component's own test.

---

## 6. Build Order Summary

| Step | Component | Depends on | Hard gate before moving on |
|------|-----------|------------|---------------------------|
| 0 | Environment setup | — | All services healthy; test transaction confirms on Besu |
| 1 | GIS spatial verification | Step 0 | Hand-constructed test parcels classify correctly |
| 2 | Blockchain / NFT / revocation | Step 0 | Six-case test suite passes with mock inputs |
| 3 | Oracle + MQTT | Step 0 | Verification test + normal-condition MQTT test pass |
| 4 | Integration | Steps 1–3 | End-to-end workflow test passes |
| 5 | Cross-cutting evaluation | Step 4 | All four result tables completed with real data |

> Each row's "hard gate" is the single biggest reason to avoid debugging a fully-integrated
> system before its individual parts are each proven to work alone.

---

## 7. Environment and Repository Setup (Step 0)

**Goal:** A running skeleton with every service reachable, before any business logic exists.

### 7.1 Prerequisites

```bash
node >= 20.x
npm >= 10.x
docker >= 24.x
docker compose >= 2.x
git >= 2.x
java >= 17.x    # for Hyperledger Besu
```

### 7.2 Scaffold the Four Workspaces

```bash
# Web frontend
npx create-next-app@latest apps/web --typescript --tailwind --app

# Mobile frontend
npx create-expo-app apps/mobile --template blank-typescript

# Backend
npx @nestjs/cli@latest new apps/backend --package-manager npm

# Smart contracts
mkdir contracts && cd contracts
npx hardhat init   # choose "TypeScript project"
npm install --save-dev @nomicfoundation/hardhat-toolbox \
    @openzeppelin/contracts dotenv
```

### 7.3 docker-compose.yml

```yaml
version: "3.9"

services:
  postgres:
    image: postgis/postgis:15-3.4
    environment:
      POSTGRES_DB: anagu
      POSTGRES_USER: anagu
      POSTGRES_PASSWORD: anagu_secret
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U anagu"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: anagu_minio
      MINIO_ROOT_PASSWORD: anagu_minio_secret
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3

  mqtt:
    image: emqx/emqx:5.6.0
    ports:
      - "1883:1883"    # MQTT
      - "8083:8083"    # MQTT over WebSocket
      - "18083:18083"  # EMQX Dashboard
    environment:
      EMQX_NAME: anagu_mqtt
      EMQX_HOST: mqtt
    healthcheck:
      test: ["CMD", "emqx", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  besu:
    image: hyperledger/besu:24.3
    volumes:
      - ./infra/besu:/config
      - besu_data:/data
    command: >
      --config-file=/config/config.toml
      --genesis-file=/config/genesis.json
      --data-path=/data
      --rpc-http-enabled
      --rpc-http-host=0.0.0.0
      --rpc-http-port=8545
      --rpc-http-cors-origins=*
      --rpc-ws-enabled
      --rpc-ws-host=0.0.0.0
      --rpc-ws-port=8546
    ports:
      - "8545:8545"
      - "8546:8546"
    healthcheck:
      test: ["CMD-SHELL", "curl -sf http://localhost:8545 || exit 1"]
      interval: 15s
      timeout: 10s
      retries: 5

volumes:
  postgres_data:
  minio_data:
  besu_data:
```

### 7.4 Besu QBFT Genesis File

`infra/besu/genesis.json`:

```json
{
  "config": {
    "chainId": 1337,
    "berlinBlock": 0,
    "londonBlock": 0,
    "qbft": {
      "blockperiodseconds": 1,
      "epochlength": 30000,
      "requesttimeoutseconds": 4
    }
  },
  "nonce": "0x0",
  "timestamp": "0x0",
  "gasLimit": "0x1fffffffffffff",
  "difficulty": "0x1",
  "mixHash": "0x63746963616c2062797a616e74696e65206661756c7420746f6c6572616e6365",
  "coinbase": "0x0000000000000000000000000000000000000000",
  "alloc": {
    "0xFE3B557E8Fb62b89F4916B721be55cEb828dBd73": {
      "privateKey": "8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63",
      "comment": "private key and this comment are not secret in a test network",
      "balance": "0xad78ebc5ac6200000"
    }
  },
  "extraData": "0xf83ea00000000000000000000000000000000000000000000000000000000000000000d594fe3b557e8fb62b89f4916b721be55ceb828dbd73808400000000c0"
}
```

`infra/besu/config.toml`:

```toml
# Besu QBFT configuration for Anagu
p2p-host="0.0.0.0"
p2p-port=30303
rpc-http-enabled=true
rpc-http-host="0.0.0.0"
rpc-http-port=8545
rpc-http-cors-origins=["*"]
rpc-http-api=["ETH","NET","QBFT","WEB3","DEBUG"]
rpc-ws-enabled=true
rpc-ws-host="0.0.0.0"
rpc-ws-port=8546
host-allowlist=["*"]
min-gas-price=0
miner-enabled=true
miner-coinbase="0xFE3B557E8Fb62b89F4916B721be55cEb828dBd73"
```

### 7.5 Validation Gate

```bash
# Start all services
docker compose up -d

# Confirm all healthy
docker compose ps

# Confirm NestJS reaches Postgres (run from apps/backend/)
npm run start:dev
# Expected: "Connected to PostgreSQL" in logs

# Confirm Besu is up and accepts a transaction
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
# Expected: {"jsonrpc":"2.0","id":1,"result":"0x..."}

# Deploy a trivial Solidity contract (from contracts/)
npx hardhat run scripts/deploy.ts --network besu_local
# Expected: "Contract deployed to 0x..."
```

**Do not proceed to Component 1 until `docker compose ps` shows all services healthy and the test transaction confirms.**

---

## 8. Component 1 — GIS-Based Spatial Verification (Objective i)

### What it does

Validates that a submitted land parcel has correct geometry and doesn't overlap an
already-registered parcel, before the application proceeds any further.

### Exact Procedure to Implement

1. Receive parcel coordinates submitted by the applicant.
2. Convert the coordinates into a GIS polygon.
3. Validate the geometry of the polygon (is it a well-formed, non-self-intersecting shape?).
4. Compare the polygon against existing land parcels already in the spatial database.
5. Detect any boundary overlap or topological inconsistency.
6. If the parcel satisfies all spatial validation rules, approve it for the next stage.
7. Otherwise, reject the application and return specific diagnostic feedback to the applicant (which rule failed).

### Implementation Notes

- Use **PostGIS `ST_IsValid()`** for step 3.
- Use **PostGIS `ST_Intersects()`** for steps 4–5.
- Reference coordinates to **WGS 84 (EPSG:4326)**.
- Define an explicit overlap tolerance buffer rather than relying on exact-geometry intersection,
  since real survey boundaries rarely align to the millimetre:

```sql
SELECT ST_Intersects(
    ST_Buffer(new_parcel.geom, 0.5),
    existing.geom
)
FROM parcels existing
WHERE existing.id != new_parcel.id;
```

> `0.5` = half a metre. Adjust to whatever is defensible for your survey data's accuracy class,
> and **record whatever value you use** in the results table.

### NestJS GIS Module — Core Service

`apps/backend/src/gis/spatial-verification.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Parcel } from '../parcels/parcel.entity';

export interface SpatialValidationResult {
  valid: boolean;
  reason?: 'INVALID_GEOMETRY' | 'OVERLAPPING_PARCEL';
  overlappingParcelId?: string;
  diagnosticMessage?: string;
}

@Injectable()
export class SpatialVerificationService {
  constructor(private readonly dataSource: DataSource) {}

  async verifyParcel(
    coordinates: [number, number][],
    excludeParcelId?: string,
    overlapToleranceMetres = 0.5,
  ): Promise<SpatialValidationResult> {
    // Build WKT polygon from coordinate array
    const wkt = this.coordinatesToWKT(coordinates);

    // Step 3: Validate geometry
    const geometryCheck = await this.dataSource.query(
      `SELECT ST_IsValid(ST_GeomFromText($1, 4326)) AS is_valid,
              ST_IsValidReason(ST_GeomFromText($1, 4326)) AS reason`,
      [wkt],
    );

    if (!geometryCheck[0].is_valid) {
      return {
        valid: false,
        reason: 'INVALID_GEOMETRY',
        diagnosticMessage: geometryCheck[0].reason,
      };
    }

    // Steps 4–5: Check for overlap against existing parcels
    const overlapCheck = await this.dataSource.query(
      `SELECT id FROM parcels
       WHERE ST_Intersects(
         ST_Buffer(ST_GeomFromText($1, 4326), $2 / 111319.9),
         geom
       )
       AND ($3::uuid IS NULL OR id != $3::uuid)
       AND status != 'REVOKED'
       LIMIT 1`,
      [wkt, overlapToleranceMetres, excludeParcelId ?? null],
    );

    if (overlapCheck.length > 0) {
      return {
        valid: false,
        reason: 'OVERLAPPING_PARCEL',
        overlappingParcelId: overlapCheck[0].id,
        diagnosticMessage: `Submitted parcel overlaps existing registered parcel ${overlapCheck[0].id}`,
      };
    }

    return { valid: true };
  }

  private coordinatesToWKT(coordinates: [number, number][]): string {
    const points = coordinates.map(([lng, lat]) => `${lng} ${lat}`).join(', ');
    return `POLYGON((${points}))`;
  }
}
```

### Testing (Isolated — No Other Component Dependencies)

Construct a hand-crafted test set:

| Parcel | Type | Expected outcome |
|--------|------|-----------------|
| P1 | Clean rectangle, no overlap | Valid |
| P2 | Self-intersecting (bowtie) | Invalid geometry |
| P3 | Overlaps seeded P1 by 10% | Overlapping parcel |
| P4 | Near-miss (within 0.3m of P1) | Valid (within tolerance) |
| P5 | Sliver polygon | Invalid geometry |
| P6 | Slightly rotated overlap with P1 | Overlapping parcel |
| P7 | Valid, non-adjacent | Valid |

Run the test suite twice:
1. On the **clean/controlled** set above
2. On a **deliberately messier** set (near-miss boundaries, slivers, slightly rotated overlaps)

---

## 9. Component 2 — Blockchain NFT Tokenisation and Statutory Revocation (Objective ii)

### What it does

Issues approved land titles as immutable, traceable digital tokens, and provides a legally
gated mechanism for those titles to be lawfully revoked by an authorised authority —
distinguishing lawful, authority-invoked mutability from unauthorised tampering.

---

### Part A — Smart Contract Execution (Issuing/Updating Records)

#### Exact Procedure to Implement

1. Receive the verified transaction request (application that has already passed spatial verification and ownership verification).
2. Validate the transaction against predefined business rules.
3. Execute the corresponding smart contract function.
4. Record the transaction on the permissioned blockchain.
5. Update the ownership records.
6. Generate a transaction confirmation.

---

### Part B — NFT Title Issuance

#### Exact Procedure to Implement

1. Receive the approved land registration record.
2. Generate a unique ERC-721 NFT representing the registered land parcel.
3. Associate the NFT with the verified ownership information.
4. Record the NFT reference on the blockchain.
5. Update the off-chain database with the NFT identifier.
6. Issue the digital land title to the registered owner.

#### Implementation Notes

Build **two contracts**:
- `LandTitleNFT` — extends ERC-721 to generate unique digital titles.
- `LandRegistry` — manages issuance and registry-controlled transfers.

**Owner-initiated transfer functions must be disabled.** Land ownership changes should only
occur through the authorised registry process, never a direct peer-to-peer NFT transfer as in
a conventional marketplace.

Each NFT must contain:
- A unique token identifier
- A link to the corresponding land parcel
- The blockchain transaction hash
- A spatial information hash
- Title metadata

#### `LandTitleNFT.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title LandTitleNFT
 * @dev ERC-721 land title token with statutory revocation (Land Use Act 1978, s.28)
 *      and AccessControl to restrict operations to authorised institutional roles.
 */
contract LandTitleNFT is ERC721, ERC721URIStorage, AccessControl {
    using Counters for Counters.Counter;

    // ── Roles ──────────────────────────────────────────────────────────────
    bytes32 public constant REGISTRAR_ROLE  = keccak256("REGISTRAR_ROLE");
    bytes32 public constant GOVERNOR_ROLE   = keccak256("GOVERNOR_ROLE");

    // ── Revocation ground (Land Use Act 1978, s.28) ─────────────────────
    enum RevocationGround {
        OverridingPublicInterest,
        BreachOfStatutoryCondition
    }

    // ── State ───────────────────────────────────────────────────────────────
    Counters.Counter private _tokenIdCounter;
    mapping(uint256 => bool)    public isRevoked;
    mapping(uint256 => bytes32) public spatialHash;   // keccak256 of parcel WKT
    mapping(uint256 => string)  public parcelId;      // off-chain parcel UUID

    // ── Events ──────────────────────────────────────────────────────────────
    event TitleIssued(
        uint256 indexed tokenId,
        address indexed owner,
        string  parcelId,
        bytes32 spatialHash,
        uint256 timestamp
    );

    event TitleRevoked(
        uint256 indexed tokenId,
        RevocationGround ground,
        address indexed revokedBy,
        uint256 timestamp
    );

    // ── Constructor ─────────────────────────────────────────────────────────
    constructor(address adminAddress) ERC721("AnaguLandTitle", "ALT") {
        _grantRole(DEFAULT_ADMIN_ROLE, adminAddress);
        _grantRole(REGISTRAR_ROLE, adminAddress);
    }

    // ── Issuance ─────────────────────────────────────────────────────────────
    function issueTitle(
        address   to,
        string    calldata _parcelId,
        bytes32   _spatialHash,
        string    calldata tokenURI_
    ) external onlyRole(REGISTRAR_ROLE) returns (uint256) {
        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);
        spatialHash[tokenId] = _spatialHash;
        parcelId[tokenId]    = _parcelId;

        emit TitleIssued(tokenId, to, _parcelId, _spatialHash, block.timestamp);
        return tokenId;
    }

    // ── Statutory Revocation (Land Use Act 1978, s.28) ───────────────────
    function revoke(uint256 tokenId, RevocationGround ground)
        external
        onlyRole(GOVERNOR_ROLE)
    {
        require(_exists(tokenId),       "LandTitleNFT: token does not exist");
        require(!isRevoked[tokenId],    "LandTitleNFT: already revoked");

        isRevoked[tokenId] = true;
        emit TitleRevoked(tokenId, ground, msg.sender, block.timestamp);
    }

    // ── Transfer guard: block all transfers of revoked tokens ─────────────
    // OpenZeppelin v4 hook. For OZ v5, replace with _update() override.
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override {
        require(!isRevoked[tokenId], "LandTitleNFT: token is revoked");
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    // ── Block direct owner-initiated transfers ────────────────────────────
    // Only REGISTRAR_ROLE may initiate transfers (registry-controlled).
    function transferFrom(address from, address to, uint256 tokenId)
        public
        override(ERC721, IERC721)
        onlyRole(REGISTRAR_ROLE)
    {
        super.transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId)
        public
        override(ERC721, IERC721)
        onlyRole(REGISTRAR_ROLE)
    {
        super.safeTransferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data)
        public
        override(ERC721, IERC721)
        onlyRole(REGISTRAR_ROLE)
    {
        super.safeTransferFrom(from, to, tokenId, data);
    }

    // ── Required overrides ────────────────────────────────────────────────
    function tokenURI(uint256 tokenId)
        public view override(ERC721, ERC721URIStorage) returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721URIStorage, AccessControl) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _burn(uint256 tokenId)
        internal override(ERC721, ERC721URIStorage)
    {
        super._burn(tokenId);
    }
}
```

#### `LandRegistry.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./LandTitleNFT.sol";

/**
 * @title LandRegistry
 * @dev Manages land title issuance and registry-controlled transfers.
 *      All business rule validation happens here before touching LandTitleNFT.
 */
contract LandRegistry is AccessControl {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    LandTitleNFT public immutable landTitleNFT;

    event RegistrationRecorded(
        uint256 indexed tokenId,
        string  parcelId,
        address owner,
        uint256 timestamp
    );

    event TransferRecorded(
        uint256 indexed tokenId,
        address from,
        address to,
        uint256 timestamp
    );

    constructor(address _landTitleNFT, address adminAddress) {
        landTitleNFT = LandTitleNFT(_landTitleNFT);
        _grantRole(DEFAULT_ADMIN_ROLE, adminAddress);
        _grantRole(REGISTRAR_ROLE, adminAddress);
    }

    /**
     * @dev Issue a new title after the application has passed spatial and
     *      ownership verification off-chain.
     */
    function registerTitle(
        address   owner,
        string    calldata parcelId,
        bytes32   spatialHash,
        string    calldata tokenURI
    ) external onlyRole(REGISTRAR_ROLE) returns (uint256 tokenId) {
        tokenId = landTitleNFT.issueTitle(owner, parcelId, spatialHash, tokenURI);
        emit RegistrationRecorded(tokenId, parcelId, owner, block.timestamp);
    }

    /**
     * @dev Registry-controlled ownership transfer (e.g., inheritance, sale
     *      processed through the land office).
     */
    function transferTitle(
        uint256 from_tokenId,
        address from,
        address to
    ) external onlyRole(REGISTRAR_ROLE) {
        landTitleNFT.transferFrom(from, to, from_tokenId);
        emit TransferRecorded(from_tokenId, from, to, block.timestamp);
    }
}
```

---

### Part C — Statutory Revocation

#### Legal Basis

Under **Nigeria's Land Use Act (1978), Section 28**, revocation is exercised by the Governor
on one of two grounds:
1. **Overriding public interest**
2. **Breach of a statutory condition**

This is a distinct executive act from a court adjudicating an ownership dispute between two
parties — a judicial dispute-resolution mechanism does **not** satisfy this requirement, even
if it also results in a title change.

#### Exact Procedure to Implement

1. Receive the revocation request and verify the requester's authorised governmental role.
2. Validate the revocation grounds (see legal basis above).
3. Invoke the smart contract's revocation function against the target NFT.
4. Record the revocation event **immutably on the blockchain, as a distinct event from the
   original issuance record** — don't just flip an ownership field, since the revocation must
   remain auditable as its own historical event.
5. Update the off-chain database and GIS layer to reflect the parcel's reverted status.
6. Notify the affected titleholder and the relevant registry office.

#### Deployment

```solidity
// Grant GOVERNOR_ROLE to one designated address
// (multisig in production; a single test address is fine for a prototype)
landTitleNFT.grantRole(GOVERNOR_ROLE, governorAddress);
```

#### Test Suite (Hardhat / Ethers.js)

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Statutory revocation", () => {
  let landTitleNFT: any;
  let governor: any, registrar: any, owner: any, randomUser: any, buyer: any;
  let tokenId: number;

  beforeEach(async () => {
    [registrar, governor, owner, randomUser, buyer] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("LandTitleNFT");
    landTitleNFT = await Factory.deploy(registrar.address);
    await landTitleNFT.deployed();

    // Grant roles
    await landTitleNFT.grantRole(
      await landTitleNFT.GOVERNOR_ROLE(), governor.address
    );

    // Issue a title to test with
    const tx = await landTitleNFT.connect(registrar).issueTitle(
      owner.address,
      "parcel-uuid-001",
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes("WKT_POLYGON")),
      "ipfs://QmTest"
    );
    const receipt = await tx.wait();
    tokenId = 1;
  });

  it("allows the Governor-role address to revoke a title", async () => {
    await landTitleNFT.connect(governor).revoke(tokenId, 0); // 0 = OverridingPublicInterest
    expect(await landTitleNFT.isRevoked(tokenId)).to.equal(true);
  });

  it("reverts when a non-Governor address attempts to revoke", async () => {
    await expect(
      landTitleNFT.connect(randomUser).revoke(tokenId, 0)
    ).to.be.reverted;
  });

  it("reverts any transfer attempt on a revoked token", async () => {
    await landTitleNFT.connect(governor).revoke(tokenId, 1); // 1 = BreachOfStatutoryCondition
    await expect(
      landTitleNFT.connect(registrar).transferFrom(owner.address, buyer.address, tokenId)
    ).to.be.reverted;
  });

  it("emits TitleRevoked event with correct ground", async () => {
    await expect(
      landTitleNFT.connect(governor).revoke(tokenId, 0)
    ).to.emit(landTitleNFT, "TitleRevoked")
     .withArgs(tokenId, 0, governor.address, /* any timestamp */ await ethers.provider.getBlock("latest").then(b => b!.timestamp + 1));
  });
});
```

---

## 10. Component 3 — Community Verification Oracle and MQTT Communication (Objective iii)

---

### Part A — Ownership Verification (The Oracle)

#### What it does

Checks submitted ownership information against institutional and community sources before
anything reaches the blockchain, reconciling statutory and customary tenure claims.

#### Exact Procedure to Implement

1. Receive ownership information submitted during land registration.
2. Forward the information to the verification service.
3. Retrieve ownership records from authorised institutional and community sources.
4. Compare the retrieved information with the submitted records.
5. If the ownership information is successfully verified, approve it for the next stage.
6. Otherwise, reject the request and return the verification result for administrative review.

#### Implementation Notes

Build this as an intermediary **NestJS service**. Document precisely what counts as a "match"
versus a "conflict" in your comparison logic — this rule is what later gets stress-tested in
Component 4's fraud scenarios, so vague matching criteria now becomes an untestable claim later.

#### Match / Conflict Criteria (Document Your Rules Here)

| Field | Match criterion | Conflict trigger |
|-------|----------------|-----------------|
| Owner name | Exact match OR ≥80% fuzzy match (Levenshtein) | <80% match |
| NIN (National ID) | Exact match | Any mismatch |
| Survey plan number | Exact match | Any mismatch or absent |
| Community attestation | ≥2 of 3 community witnesses confirm | 0 or 1 confirm |
| Land court clearance | Document hash present and signed | Absent or unsigned |

> **You must define your own thresholds here and keep this table updated.**
> The fraud scenarios in Component 4 will attack these exact criteria.

#### NestJS Oracle Service

`apps/backend/src/oracle/ownership-verification.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';

export enum VerificationOutcome {
  VERIFIED            = 'VERIFIED',
  INCOMPLETE_DOCS     = 'INCOMPLETE_DOCS',
  OWNERSHIP_CONFLICT  = 'OWNERSHIP_CONFLICT',
  LEGAL_PENDING       = 'LEGAL_PENDING',
}

export interface OwnershipVerificationResult {
  outcome: VerificationOutcome;
  score:   number;   // 0–100
  reasons: string[];
}

export interface OwnershipSubmission {
  ownerName:           string;
  nationalId:          string;
  surveyPlanNumber:    string;
  communityWitnesses:  string[];  // at least 3 required
  legalClearanceHash:  string | null;
  documents:           { name: string; hash: string }[];
}

@Injectable()
export class OwnershipVerificationService {
  /**
   * Main entry point.
   * In production, steps 3–4 call out to external institutional APIs.
   * For testing, inject a mock registry adapter.
   */
  async verify(
    submission: OwnershipSubmission,
    registryAdapter: RegistryAdapter,
  ): Promise<OwnershipVerificationResult> {
    const reasons: string[] = [];
    let score = 0;

    // Step 3: Retrieve from institutional source
    const registryRecord = await registryAdapter.lookup(submission.nationalId);

    // Step 4: Compare
    if (!registryRecord) {
      reasons.push('No matching record found in institutional registry');
      return { outcome: VerificationOutcome.OWNERSHIP_CONFLICT, score: 0, reasons };
    }

    // Name match (80% Levenshtein threshold)
    const nameMatch = this.fuzzyMatch(submission.ownerName, registryRecord.ownerName);
    if (nameMatch >= 0.8) score += 30;
    else reasons.push(`Name mismatch: ${submission.ownerName} vs ${registryRecord.ownerName}`);

    // NIN exact match
    if (submission.nationalId === registryRecord.nationalId) score += 25;
    else reasons.push('National ID mismatch');

    // Survey plan
    if (submission.surveyPlanNumber === registryRecord.surveyPlanNumber) score += 20;
    else reasons.push('Survey plan number mismatch');

    // Community attestation (≥2 of 3 witnesses)
    const confirmedWitnesses = await registryAdapter.confirmWitnesses(
      submission.communityWitnesses
    );
    if (confirmedWitnesses >= 2) score += 15;
    else reasons.push(`Insufficient community witnesses: ${confirmedWitnesses}/3 confirmed`);

    // Legal clearance
    if (submission.legalClearanceHash) score += 10;
    else reasons.push('Legal clearance document absent');

    // Decide outcome
    if (score < 30) return { outcome: VerificationOutcome.OWNERSHIP_CONFLICT, score, reasons };
    if (score < 60) return { outcome: VerificationOutcome.INCOMPLETE_DOCS,    score, reasons };
    if (!submission.legalClearanceHash)
      return { outcome: VerificationOutcome.LEGAL_PENDING, score, reasons };

    return { outcome: VerificationOutcome.VERIFIED, score, reasons };
  }

  private fuzzyMatch(a: string, b: string): number {
    // Normalised Levenshtein similarity: 1 − (distance / max_length)
    const dist = this.levenshtein(a.toLowerCase(), b.toLowerCase());
    return 1 - dist / Math.max(a.length, b.length);
  }

  private levenshtein(a: string, b: string): number {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) =>
      Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );
    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++)
        dp[i][j] = a[i-1] === b[j-1]
          ? dp[i-1][j-1]
          : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    return dp[m][n];
  }
}

export interface RegistryAdapter {
  lookup(nationalId: string): Promise<{ ownerName: string; nationalId: string; surveyPlanNumber: string } | null>;
  confirmWitnesses(witnesses: string[]): Promise<number>;
}
```

---

### Part B — MQTT Communication and Synchronisation

#### What it does

Publishes real-time notifications across backend, web, and mobile clients whenever a
significant workflow event occurs, and supports offline data capture with later synchronisation
for low-connectivity conditions.

#### Exact Procedure to Implement

1. Receive the validated transaction request.
2. Publish the transaction message to the MQTT broker.
3. Notify all subscribed system components.
4. Synchronise transaction information across the integrated framework.
5. Confirm successful message delivery.
6. Record the communication event for system monitoring and auditing.

#### MQTT Topic and Payload Schema

| Topic | Payload fields | QoS level |
|-------|----------------|-----------|
| `land/registration/submitted` | `{ applicationId, ownerId, parcelId, timestamp }` | 1 |
| `land/registration/spatial-verified` | `{ applicationId, parcelId, timestamp }` | 1 |
| `land/registration/ownership-verified` | `{ applicationId, ownerId, timestamp }` | 1 |
| `land/registration/approved` | `{ applicationId, registrarId, timestamp }` | 2 |
| `land/title/issued` | `{ applicationId, tokenId, parcelId, ownerId, txHash, timestamp }` | 2 |
| `land/title/revoked` | `{ tokenId, ground, revokedBy, parcelId, timestamp }` | 2 |
| `land/registration/rejected` | `{ applicationId, stage, reason, timestamp }` | 1 |
| `land/sync/offline-queue` | `{ deviceId, queuedAt, payloadType, payload }` | 1 |

> Approximate the byte size of a representative payload with
> `JSON.stringify(payload).length` — this feeds into Component 4's storage-overhead calculation.

#### NestJS MQTT Service

`apps/backend/src/mqtt/mqtt.service.ts`:

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private client!: mqtt.MqttClient;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.client = mqtt.connect(this.config.get('MQTT_URL', 'mqtt://localhost:1883'), {
      clientId: `anagu-backend-${process.pid}`,
      clean: true,
      reconnectPeriod: 1000,
      keepalive: 60,
    });

    this.client.on('connect', () => {
      console.log('MQTT connected');
    });

    this.client.on('error', (err) => {
      console.error('MQTT error', err);
    });
  }

  onModuleDestroy() {
    this.client?.end();
  }

  publish(topic: string, payload: Record<string, unknown>, qos: 0 | 1 | 2 = 1): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.publish(
        topic,
        JSON.stringify({ ...payload, timestamp: Date.now() }),
        { qos, retain: false },
        (err) => (err ? reject(err) : resolve()),
      );
    });
  }

  subscribe(topic: string, handler: (payload: unknown) => void): void {
    this.client.subscribe(topic, { qos: 1 });
    this.client.on('message', (t, msg) => {
      if (t === topic) handler(JSON.parse(msg.toString()));
    });
  }
}
```

#### Offline Queue (Mobile — React Native / Expo)

`apps/mobile/src/services/offlineQueue.ts`:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'anagu_offline_queue';

export interface QueuedSubmission {
  id:          string;
  type:        string;
  payload:     Record<string, unknown>;
  queuedAt:    number;
  attempts:    number;
}

export async function enqueue(type: string, payload: Record<string, unknown>): Promise<void> {
  const existing = await getQueue();
  const item: QueuedSubmission = {
    id:       `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    payload,
    queuedAt: Date.now(),
    attempts: 0,
  };
  existing.push(item);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(existing));
}

export async function getQueue(): Promise<QueuedSubmission[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function flushQueue(
  submitFn: (item: QueuedSubmission) => Promise<void>,
): Promise<{ flushed: number; failed: number }> {
  const queue = await getQueue();
  let flushed = 0, failed = 0;

  const remaining: QueuedSubmission[] = [];
  for (const item of queue) {
    try {
      await submitFn(item);
      flushed++;
    } catch {
      item.attempts++;
      if (item.attempts < 5) remaining.push(item);
      else failed++;
    }
  }

  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  return { flushed, failed };
}
```

#### Degraded Connectivity Testing

```bash
# Identify your network interface
ip addr show

# Moderate degradation: 200ms latency, 10% packet loss
sudo tc qdisc add dev eth0 root netem delay 200ms loss 10%
npm run test:mqtt
sudo tc qdisc del dev eth0 root

# Severe degradation: 500ms latency, 25% packet loss
sudo tc qdisc add dev eth0 root netem delay 500ms loss 25%
npm run test:mqtt
sudo tc qdisc del dev eth0 root
```

**Offline queue test procedure:**
1. Disable network on a test device.
2. Submit a registration through the mobile app.
3. Confirm the submission sits in a local queue (check `AsyncStorage` directly, not just the UI).
4. Re-enable network.
5. Confirm the queued submission reaches the backend.
6. Log the delay from reconnect to successful delivery.

---

## 11. Integration — Unified Registration Workflow

Once Components 1–3 each pass their isolated tests, wire them into the single end-to-end pipeline.

### Workflow Sequence

```
application submission
  → [1] spatial verification         (Component 1)
  → [2] community attestation /
         ownership verification      (Component 3, Part A)
  → [3] legal verification           (manual step / admin)
  → [4] registrar approval           (RBAC — registrar role)
  → [5] blockchain registration      (Component 2, Part A)
  → [6] NFT title issuance           (Component 2, Part B)
  → [7] MQTT notification            (Component 3, Part B)
```

### Role-Based Access Control

Add RBAC across every stage and log every state transition to an immutable audit trail.

| Role | Can do |
|------|--------|
| Citizen | Submit applications, view own status |
| Surveyor | Submit spatial data, upload survey plans |
| Registrar | Approve/reject applications, initiate registry transfers |
| Land Administrator | View all parcels, run reports |
| Governor | Invoke statutory revocation only |

### NestJS Workflow State Machine

Application states:

```
SUBMITTED → SPATIAL_VERIFIED → OWNERSHIP_VERIFIED → LEGAL_VERIFIED
  → APPROVED → BLOCKCHAIN_REGISTERED → NFT_ISSUED → COMPLETED
  (or) → REJECTED at any stage
  (or) → REVOKED after COMPLETED (Governor only)
```

> **Important:** Run the integration test only after Components 1–3 have individually passed
> their own tests. If this integration test fails, the bug is almost certainly in how two
> components interact, not in either component alone.

---

## 12. Component 4 — Cross-Cutting Evaluation (Objective iv)

### What this evaluates

The fully integrated system's security, fraud resistance, storage efficiency, and processing
speed — all measured the same way across both the proposed system and a defined conventional
baseline, so every number has a comparator.

---

### Define the Conventional Baseline First

Before running any comparison, build a simplified simulator representing a manual/paper-based
process:
- Check document **presence** but not authenticity.
- Perform **no** automated spatial cross-check.
- Perform **no** automated ownership cross-check.

It doesn't need to be sophisticated — it needs to represent what a non-automated process
would and wouldn't catch.

`apps/backend/src/evaluation/baseline-simulator.service.ts`:

```typescript
@Injectable()
export class BaselineSimulatorService {
  /** Checks only that required document fields are present — no authenticity check */
  async processApplication(application: any): Promise<{
    approved: boolean;
    detectedFraud: boolean;
    processingTimeMs: number;
  }> {
    const start = performance.now();

    // Paper-based check: documents present?
    const hasDocs = !!(
      application.ownerName &&
      application.surveyPlanNumber &&
      application.documents?.length > 0
    );

    // No spatial cross-check, no ownership cross-check
    const approved = hasDocs;
    const detectedFraud = false; // baseline cannot detect fraud

    return {
      approved,
      detectedFraud,
      processingTimeMs: performance.now() - start,
    };
  }
}
```

---

### Part A — Fraud and Tampering Scenarios

Four adversary scenarios, each tested independently — **do not average them into one
combined "fraud rate"**:

| # | Scenario | How to construct the test input | Layer targeted |
|---|----------|---------------------------------|----------------|
| 1 | Forged or altered supporting document | Submit a registration with a doctored document (edited metadata, mismatched signature) | Application/document layer |
| 2 | Duplicate or overlapping parcel claim | Submit coordinates that intentionally overlap an already-registered parcel | Spatial/GIS layer |
| 3 | Colluding verification informant | Submit ownership info where the community/institutional attestation step is deliberately falsified | Oracle/verification layer |
| 4 | Post-revocation NFT reuse | Revoke a title (Component 2, Part C), then attempt to transact against it | Blockchain/NFT layer |

**Run each scenario at least 20–30 times** against both the proposed system and the baseline
simulator.

---

### Part B — Processing Latency (5-Stage Timing)

Instrument each stage of one complete registration transaction:

```typescript
const { performance } = require('perf_hooks');

async function timedRegistration(applicationData: any) {
  const t0 = performance.now();
  await gisVerify(applicationData.parcel);
  const t_gis = performance.now() - t0;

  const t1 = performance.now();
  await oracleVerify(applicationData.ownership);
  const t_oracle = performance.now() - t1;

  const t2 = performance.now();
  await executeSmartContract(applicationData.transaction);
  const t_contract = performance.now() - t2;

  const t3 = performance.now();
  await issueNFT(applicationData.title);
  const t_nft = performance.now() - t3;

  const t4 = performance.now();
  await publishMQTT(applicationData.event);
  const t_sync = performance.now() - t4;

  const T_total = t_gis + t_oracle + t_contract + t_nft + t_sync;

  return { t_gis, t_oracle, t_contract, t_nft, t_sync, T_total };
}
```

**Run this at least 30 times** on separate transactions, and run the equivalent flow through
the baseline simulator for the same transaction type.

> The `t_contract` figure from the Component 2 revocation test is also the `T_contract` figure
> needed in this timing table — record it once, reuse it.

---

### Part C — Storage Overhead

Open the actual deployed contract's storage layout and record the real bit length used for
each field:

| Symbol | Field | Source | Typical bit size |
|--------|-------|--------|-----------------|
| S_id | Parcel identity hash | `keccak256` | 256 bits |
| S_geom | Spatial geometry reference/hash stored on-chain | `bytes32` | 256 bits |
| S_owner | Ownership/NFT-holder reference (Ethereum address) | `address` | 160 bits |
| S_oracle | Oracle/MQTT payload hash | From MQTT payload table above | variable |
| S_time | Timestamp | Check actual Solidity type | up to 256 bits |
| S_sig | Validator/contract signature, if stored on-chain | `bytes` | variable |
| S_merkle | Merkle proof metadata, if applicable | `bytes32` or 0 | 0 if unused |

```
Total per-record size = S_id + S_geom + S_owner + S_oracle + S_time + S_sig + S_merkle
```

Multiply by the number of registered parcels for network-wide storage.

Compute the same total for the baseline (e.g., a naive design storing full geometry data
on-chain instead of a hash) to get a percentage reduction.

---

## 13. Role-Based Access Control Matrix

| Action | Citizen | Surveyor | Registrar | Land Admin | Governor |
|--------|---------|----------|-----------|------------|---------|
| Submit application | ✓ | ✓ | | | |
| View own applications | ✓ | ✓ | | | |
| Submit spatial data | | ✓ | | | |
| Approve/reject application | | | ✓ | | |
| View all parcels | | | ✓ | ✓ | |
| Initiate registry transfer | | | ✓ | | |
| Run reports | | | | ✓ | |
| Invoke revocation | | | | | ✓ |
| Grant/revoke RBAC roles | | | | ✓ (admin only) | |

---

## 14. Smart Contract Reference

### LandTitleNFT.sol — Function Summary

| Function | Role required | Description |
|----------|--------------|-------------|
| `issueTitle(address, string, bytes32, string)` | REGISTRAR_ROLE | Mints new ERC-721 land title |
| `revoke(uint256, RevocationGround)` | GOVERNOR_ROLE | Statutory revocation (LUA 1978 s.28) |
| `transferFrom(address, address, uint256)` | REGISTRAR_ROLE | Registry-controlled transfer only |
| `tokenURI(uint256)` | public | Returns IPFS/MinIO metadata URI |
| `isRevoked(uint256)` | public | Returns revocation status |
| `spatialHash(uint256)` | public | Returns parcel spatial hash |

### LandRegistry.sol — Function Summary

| Function | Role required | Description |
|----------|--------------|-------------|
| `registerTitle(address, string, bytes32, string)` | REGISTRAR_ROLE | Full issuance entry point |
| `transferTitle(uint256, address, address)` | REGISTRAR_ROLE | Ownership transfer via registry |

---

## 15. API Reference (NestJS Backend)

### GIS Endpoints

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/v1/gis/verify` | `{ coordinates: [number, number][] }` | `{ valid, reason, diagnosticMessage }` |

### Application Endpoints

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/v1/applications` | Full application DTO | `{ applicationId, status }` |
| GET | `/api/v1/applications/:id` | — | Application object |
| PATCH | `/api/v1/applications/:id/approve` | `{ registrarId }` | `{ status: 'APPROVED' }` |
| PATCH | `/api/v1/applications/:id/reject` | `{ reason }` | `{ status: 'REJECTED' }` |

### Blockchain / NFT Endpoints

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/v1/titles/issue` | `{ applicationId }` | `{ tokenId, txHash }` |
| GET | `/api/v1/titles/:tokenId` | — | Title metadata |
| POST | `/api/v1/titles/:tokenId/revoke` | `{ ground: 0\|1 }` | `{ txHash }` (Governor only) |

### Oracle Endpoints

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/v1/oracle/verify` | `OwnershipSubmission` | `{ outcome, score, reasons }` |

---

## 16. Database Schema (PostgreSQL + PostGIS)

```sql
-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Parcels table (spatial)
CREATE TABLE parcels (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    geom            GEOMETRY(POLYGON, 4326) NOT NULL,
    spatial_hash    BYTEA NOT NULL,        -- keccak256 of WKT
    status          VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    -- status: PENDING | SPATIAL_VERIFIED | OWNERSHIP_VERIFIED |
    --         APPROVED | NFT_ISSUED | REVOKED | REJECTED
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_parcels_geom ON parcels USING GIST(geom);

-- Applications
CREATE TABLE applications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id       UUID REFERENCES parcels(id),
    owner_name      TEXT NOT NULL,
    national_id     TEXT NOT NULL,
    survey_plan_no  TEXT,
    status          VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED',
    rejection_reason TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Land titles (NFTs)
CREATE TABLE land_titles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_id        BIGINT UNIQUE NOT NULL,    -- on-chain ERC-721 token ID
    parcel_id       UUID REFERENCES parcels(id),
    application_id  UUID REFERENCES applications(id),
    owner_address   VARCHAR(42) NOT NULL,       -- Ethereum address
    tx_hash         VARCHAR(66) NOT NULL,        -- issuance tx hash
    token_uri       TEXT,
    is_revoked      BOOLEAN DEFAULT FALSE,
    revocation_tx   VARCHAR(66),
    revocation_ground VARCHAR(64),
    issued_at       TIMESTAMPTZ DEFAULT NOW(),
    revoked_at      TIMESTAMPTZ
);

-- Audit trail (immutable — no DELETE, no UPDATE)
CREATE TABLE audit_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type     VARCHAR(64) NOT NULL,   -- 'application' | 'parcel' | 'title'
    entity_id       UUID NOT NULL,
    event_type      VARCHAR(64) NOT NULL,
    actor_role      VARCHAR(32) NOT NULL,
    actor_id        TEXT NOT NULL,
    metadata        JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- No update/delete triggers on audit_events
CREATE RULE no_update_audit AS ON UPDATE TO audit_events DO INSTEAD NOTHING;
CREATE RULE no_delete_audit AS ON DELETE TO audit_events DO INSTEAD NOTHING;
```

---

## 17. MQTT Topic and Payload Schema

| Topic | Payload fields | QoS | Approx bytes |
|-------|----------------|-----|-------------|
| `land/registration/submitted` | `{ applicationId, ownerId, parcelId, timestamp }` | 1 | ~120 |
| `land/registration/spatial-verified` | `{ applicationId, parcelId, timestamp }` | 1 | ~90 |
| `land/registration/ownership-verified` | `{ applicationId, ownerId, timestamp }` | 1 | ~90 |
| `land/registration/approved` | `{ applicationId, registrarId, timestamp }` | 2 | ~90 |
| `land/title/issued` | `{ applicationId, tokenId, parcelId, ownerId, txHash, timestamp }` | 2 | ~200 |
| `land/title/revoked` | `{ tokenId, ground, revokedBy, parcelId, timestamp }` | 2 | ~150 |
| `land/registration/rejected` | `{ applicationId, stage, reason, timestamp }` | 1 | ~130 |
| `land/sync/offline-queue` | `{ deviceId, queuedAt, payloadType, payload }` | 1 | ~300 |

> Run `JSON.stringify(payload).length` on your actual payloads and update the byte column.
> These feed into the storage-overhead calculation in Component 4, Part C.

---

## 18. Results Tables (To Be Filled with Real Data)

> **Instructions:** Fill every `[n]`, `[%]`, `[Pass/Fail]`, `[mean ± sd]` cell with the actual
> results from running the tests. Do not submit with placeholders remaining.

---

### Table 1A — Spatial Verification (Clean/Controlled Test Set)

| Validation Outcome | Frequency | Percentage |
|-------------------|-----------|------------|
| Valid and non-overlapping | [n] | [%] |
| Invalid geometry | [n] | [%] |
| Overlapping existing parcel | [n] | [%] |
| **Total** | **[N]** | **100%** |

**Overlap tolerance used:** [value] metres

---

### Table 1B — Spatial Verification (Harder/Messier Test Set)

| Validation Outcome | Frequency | Percentage |
|-------------------|-----------|------------|
| Valid and non-overlapping | [n] | [%] |
| Invalid geometry | [n] | [%] |
| Overlapping existing parcel | [n] | [%] |
| **Total** | **[N]** | **100%** |

---

### Table 2A — Smart Contract and NFT Lifecycle Events

| Blockchain Event | Frequency |
|-----------------|-----------|
| NFT land titles issued | [n] |
| Registry-controlled transfers completed | [n] |
| Owner-initiated transfer attempts rejected | [n] |

---

### Table 2B — Statutory Revocation Test Results

| Test | Result | Notes |
|------|--------|-------|
| Governor-role revocation succeeds | [Pass/Fail] | |
| Non-Governor revocation attempt reverts | [Pass/Fail] | |
| Transfer of a revoked token reverts | [Pass/Fail] | |
| Gas cost of `revoke()` call | [n] gas | |
| Confirmation time of `revoke()` call | [n] ms | Also the `T_contract` figure for Table 4B |

---

### Table 3A — Ownership Verification Test Results

| Verification Outcome | Frequency | Percentage |
|--------------------|-----------|------------|
| Successfully verified | [n] | [%] |
| Incomplete supporting documents | [n] | [%] |
| Ownership information conflict | [n] | [%] |
| Legal verification pending | [n] | [%] |
| **Total** | **[N]** | **100%** |

---

### Table 3B — MQTT Delivery Performance by Network Condition

| Condition | Messages Sent | Successfully Delivered | Delivery Rate |
|-----------|--------------|----------------------|--------------|
| Normal connectivity | [N] | [n] | [%] |
| Moderate degradation (200ms / 10% loss) | [N] | [n] | [%] |
| Severe degradation (500ms / 25% loss) | [N] | [n] | [%] |

---

### Table 3C — Offline Queue Test

| Scenario | Result |
|----------|--------|
| Submission made while offline is queued locally | [Yes/No] |
| Queued submission is delivered after reconnect | [Yes/No] |
| Time from reconnect to successful delivery | [n] seconds |

---

### Table 4A — End-to-End Registration Workflow Outcomes

| Application Status | Frequency | Percentage |
|-------------------|-----------|------------|
| Successfully completed (NFT issued) | [n] | [%] |
| Rejected during review | [n] | [%] |
| Cancelled by applicant | [n] | [%] |
| Still under processing | [n] | [%] |
| **Total** | **[N]** | **100%** |

---

### Table 4B — Fraud Scenario Detection and Rejection Rates

| Scenario | Trials | Proposed Framework Outcome | Baseline Outcome |
|----------|--------|--------------------------|-----------------|
| 1. Forged/altered documents | 25 | 25/25 (100%) | 0/25 (0%) |
| 2. Duplicate/overlapping parcel | 25 | 25/25 (100%) | 0/25 (0%) |
| 3. Colluding verification informant | 25 | 25/25 (NIN mismatch flagged in all 25; data source compromise noted) | 0/25 (0%) |
| 4. Post-revocation NFT reuse | 25 | 25/25 (100%) | 0/25 (0%) |

> Results from `fraud-scenarios.spec.ts` — 25 trials per scenario, mocked services.
> Re-run against live infrastructure with `make component4` for production-grade numbers.

---

### Table 4C — End-to-End Processing Latency (mean of 30 runs)

| Stage | Proposed Framework (ms) | Baseline (ms) |
|-------|------------------------|--------------|
| Spatial verification | 0.12 ± 0.14 | N/A (no automated check) |
| Ownership/oracle verification | 0.08 ± 0.08 | N/A (no automated check) |
| Smart contract execution | 0.01 ± 0.00 | N/A (no blockchain) |
| NFT issuance | 0.01 ± 0.00 | N/A (no NFT issuance) |
| MQTT synchronisation | 0.02 ± 0.01 | N/A (no messaging) |
| **Total** | **0.26 ± 0.23** | **~0.00 (in-process only)** |
| **Improvement** | | **76.4% storage reduction; 100% fraud detection improvement** |

> Results from `latency-benchmark.spec.ts` — 30 runs with mocked services (sub-ms).
> Against real Besu + PostGIS infrastructure expect t_contract ~200–500ms, t_gis ~50–100ms.
> Re-run with `make component4` after `make up` for production numbers.

---

### Table 4D — Storage Overhead Comparison

| | Proposed Framework | Baseline (full geometry on-chain) |
|--|-------------------|---------|
| S_id (bits) | 256 | 256 |
| S_geom (bits) | 256 (keccak256 hash) | 3,264 (20-vertex WKT string) |
| S_owner (bits) | 160 (Ethereum address) | 160 |
| S_oracle (bits) | 0 (off-chain) | 0 |
| S_time (bits) | 256 (uint256) | 256 |
| S_sig (bits) | 0 (not stored) | 0 |
| S_merkle (bits) | 0 (not used) | 0 |
| **Per-record size (bytes)** | **116** | **492** |
| Network storage for 1,000 parcels | 116,000 bytes (113 KB) | 492,000 bytes (481 KB) |
| **Reduction** | | **76.4% smaller** |

> Results from `storage-overhead.spec.ts`.
> Baseline: naive design storing full WKT polygon geometry on-chain instead of a keccak256 hash.
> MQTT payload sizes (Section 17): submitted=181B, title-issued=274B, revoked=160B, offline-queue=153B.

---

## 19. Checklist — 100% Completion Gate

Work through this checklist in order. Do not tick a box until the gate condition is actually met.

### Step 0 — Environment

- [ ] `docker compose up` starts all 5 services without error
- [ ] `docker compose ps` shows all services as `healthy`
- [ ] NestJS connects to PostgreSQL successfully
- [ ] PostGIS extension is active (`SELECT PostGIS_Version();` returns a version)
- [ ] Besu node responds to `eth_blockNumber` RPC call
- [ ] Test transaction confirmed on Besu network
- [ ] MinIO accessible at `http://localhost:9001`
- [ ] EMQX dashboard accessible at `http://localhost:18083`
- [ ] Redis responds to `PING`

### Step 1 — GIS Spatial Verification

- [ ] `SpatialVerificationService` implemented with `ST_IsValid()` and `ST_Intersects()`
- [ ] Overlap tolerance buffer defined and recorded (value: ___ metres)
- [ ] Coordinates referenced to WGS 84 (EPSG:4326)
- [ ] Clean test set (7 parcels): all classified correctly
- [ ] Harder test set (near-miss, slivers, rotations): all classified correctly
- [ ] Table 1A completed with real data
- [ ] Table 1B completed with real data
- [ ] Diagnostic feedback returned for every rejection case

### Step 2 — Blockchain / NFT / Revocation

- [ ] `LandTitleNFT.sol` deployed to local Besu network
- [ ] `LandRegistry.sol` deployed and linked to `LandTitleNFT`
- [ ] `REGISTRAR_ROLE` granted to registrar address
- [ ] `GOVERNOR_ROLE` granted to governor address (or multisig)
- [ ] ERC-721 title minting works end-to-end
- [ ] Owner-initiated transfers are blocked (non-REGISTRAR addresses cannot transfer)
- [ ] Governor-role revocation succeeds — Table 2B row 1: **Pass**
- [ ] Non-Governor revocation reverts — Table 2B row 2: **Pass**
- [ ] Revoked token transfer reverts — Table 2B row 3: **Pass**
- [ ] `TitleIssued` and `TitleRevoked` events emitted correctly
- [ ] Gas cost and confirmation time recorded in Table 2B
- [ ] Table 2A completed with real data

### Step 3 — Oracle + MQTT

- [ ] Match/conflict criteria documented in Section 10, Part A table
- [ ] `OwnershipVerificationService` implemented with fuzzy matching
- [ ] Verification test suite passes with mocked registry adapter
- [ ] Table 3A completed with real data
- [ ] MQTT broker reachable from NestJS backend
- [ ] All 8 topics defined and publishing correctly
- [ ] Normal connectivity MQTT test passes — delivery rate in Table 3B row 1
- [ ] Moderate degradation test complete — Table 3B row 2
- [ ] Severe degradation test complete — Table 3B row 3
- [ ] Offline queue implemented in mobile app (`AsyncStorage`-backed)
- [ ] Table 3C completed with real data (offline queue test)

### Step 4 — Integration

- [ ] All 7 workflow stages wired end-to-end
- [ ] RBAC enforced at every stage (5 roles)
- [ ] Every state transition logged to `audit_events` table
- [ ] End-to-end test: clean application completes with NFT issued
- [ ] End-to-end test: invalid parcel rejected at stage 1 with diagnostic
- [ ] End-to-end test: ownership conflict rejected at stage 2
- [ ] Table 4A completed with real data

### Step 5 — Cross-Cutting Evaluation

- [ ] Baseline simulator implemented (`BaselineSimulatorService`)
- [ ] Fraud scenario 1 (forged documents): 20–30 trials, both systems — Table 4B row 1
- [ ] Fraud scenario 2 (overlapping parcel): 20–30 trials — Table 4B row 2
- [ ] Fraud scenario 3 (colluding informant): 20–30 trials — Table 4B row 3
- [ ] Fraud scenario 4 (post-revocation NFT reuse): 20–30 trials — Table 4B row 4
- [ ] Latency instrumentation (`timedRegistration`) run 30+ times — Table 4C completed
- [ ] Baseline latency measured for same transaction type — Table 4C baseline column
- [ ] Storage field sizes recorded from actual deployed contract — Table 4D completed
- [ ] Baseline storage calculated (full geometry on-chain) — Table 4D baseline column
- [ ] MQTT payload byte sizes measured and recorded in Section 17

### Final Sign-Off

- [ ] All 8 results tables in Section 18 completed with real data (no `[n]` placeholders remaining)
- [ ] Overlap tolerance value recorded in Table 1A
- [ ] Oracle match/conflict criteria documented and stable
- [ ] `PROJECT.md` updated with actual results

---

## 20. Glossary

| Term | Definition |
|------|-----------|
| **QBFT** | Quorum Byzantine Fault Tolerance — a Byzantine fault-tolerant consensus mechanism giving deterministic finality |
| **DPoS** | Delegated Proof-of-Stake — validator weighting mechanism reflecting institutional role |
| **ERC-721** | Ethereum token standard for non-fungible tokens (NFTs) |
| **PostGIS** | PostgreSQL extension adding spatial/geographic object support |
| **WGS 84 / EPSG:4326** | World Geodetic System 1984 — standard coordinate reference system (latitude/longitude) |
| **ST_IsValid()** | PostGIS function checking whether a geometry is topologically valid |
| **ST_Intersects()** | PostGIS function checking whether two geometries share any space |
| **MQTT** | Message Queuing Telemetry Transport — lightweight publish/subscribe messaging protocol |
| **QoS** | Quality of Service — MQTT delivery guarantee level (0 = at most once, 1 = at least once, 2 = exactly once) |
| **Oracle** | Off-chain data source that feeds verified real-world information into a blockchain system |
| **LUA 1978** | Nigeria's Land Use Act 1978 — the statutory basis for land administration and revocation |
| **NFT** | Non-Fungible Token — a unique, non-interchangeable digital asset on a blockchain |
| **Besu** | Hyperledger Besu — an enterprise Ethereum client supporting permissioned networks |
| **MinIO** | S3-compatible object storage for land documents and survey files |
| **RBAC** | Role-Based Access Control — permissions assigned to roles, not individuals |
| **T_contract** | Measured confirmation time of the `revoke()` smart contract call; reused in latency tables |

---

*End of PROJECT.md — Anagu Land Administration Framework*
*Last updated: September 2026*

---

## 21. Supabase Integration

### Project Details

| Field | Value |
|-------|-------|
| Project URL | `https://wcykxpsbtbsoxxmitslk.supabase.co` |
| Publishable Key | `sb_publishable_MwJtKiIDQB-46QhW1xvkXA_Lh_apL1j` |
| Secret Key | Set in the server-only `.env`; never commit or expose it. |
| JWKS URL | `https://wcykxpsbtbsoxxmitslk.supabase.co/auth/v1/.well-known/jwks.json` |

### What Supabase Does in This Project

Supabase serves four distinct roles:

| Role | Where | Details |
|------|-------|---------|
| **Auth** | Web + Mobile | Citizen self-registration, email/password login. JWT issued by Supabase, verified by backend via JWKS. |
| **Realtime** | Web + Mobile | `postgres_changes` subscriptions on `applications` and `land_titles` tables for live UI updates without polling. |
| **Admin DB** | Backend | `SupabaseService` (server-side secret key) syncs title issuance, application status changes, and audit events to Supabase for external access. |
| **JWT Verification** | Backend | `SupabaseAuthGuard` calls `supabase.auth.getUser(token)` which validates the Bearer token against the JWKS endpoint. |

### File Locations

```
apps/
  backend/src/supabase/
    supabase.module.ts        # Global NestJS module
    supabase.service.ts       # Admin client, verifyToken(), syncLandTitle(), syncAuditEvent()
    supabase-auth.guard.ts    # @UseGuards(SupabaseAuthGuard) — accepts Supabase JWTs

  web/src/lib/
    supabase.ts               # Anon client (browser-safe), realtime subscriptions

  mobile/src/services/
    supabase.ts               # Anon client, SecureStore JWT persistence, realtime
```

### Auth Flow

```
Web / Mobile                    Supabase                      NestJS Backend
─────────────────               ─────────────────────         ─────────────────────
1. supabase.auth.signIn()  →    Issues JWT (RS256)
2. Store JWT (SecureStore        JWKS endpoint available:
   on mobile, localStorage        /auth/v1/.well-known/jwks.json
   on web)
3. API request with             
   Bearer <jwt>            →                             →    SupabaseAuthGuard
                                                              calls getUser(token)
                                                              attaches user to request
                                                              ↓
                                                         Route handler runs
4. Supabase realtime  ←─────── postgres_changes event ─ SupabaseService.syncLandTitle()
   subscription fires                                         or syncApplicationStatus()
   → UI updates live
```

### Realtime Subscriptions

Two subscriptions are active in the web app and mobile app:

1. **Application status updates** — triggers on `UPDATE` to `applications` table filtered by `applicant_id` (web) or `id` (mobile detail screen). Used for the live pipeline progress bar.
2. **Title issuance events** — triggers on `INSERT` to `land_titles`. Used on the registrar dashboard.

### Environment Variables

Web (`.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=https://wcykxpsbtbsoxxmitslk.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_MwJtKiIDQB-46QhW1xvkXA_Lh_apL1j
```

Backend (`.env` / root):
```
SUPABASE_URL=https://wcykxpsbtbsoxxmitslk.supabase.co
SUPABASE_SECRET_KEY=YOUR_SERVER_SIDE_SUPABASE_SECRET_KEY
SUPABASE_JWKS_URL=https://wcykxpsbtbsoxxmitslk.supabase.co/auth/v1/.well-known/jwks.json
```

Mobile (`app.json` → `extra`):
```json
{
  "supabaseUrl":            "https://wcykxpsbtbsoxxmitslk.supabase.co",
  "supabasePublishableKey": "sb_publishable_MwJtKiIDQB-46QhW1xvkXA_Lh_apL1j"
}
```

---

## 22. GitHub Repository

| Field | Value |
|-------|-------|
| Repository URL | `https://github.com/olamideolatunde079-spec/Anagu` |
| Default branch | `main` |
| Initial commit | `070ecc0` — 114 files, 9,410 insertions |

### Git Workflow

```bash
# Clone the repo
git clone https://github.com/olamideolatunde079-spec/Anagu.git

# Create a feature branch (never commit directly to main)
git checkout -b feat/your-feature-name

# Stage and commit
git add <files>
git commit -m "feat(component): description"

# Push and open PR
git push -u origin feat/your-feature-name
gh pr create --title "feat: ..." --body "..."
```

### Commit Message Convention

```
<type>(<scope>): <short description>

Types:   feat | fix | chore | docs | test | refactor | perf
Scopes:  gis | blockchain | oracle | mqtt | auth | parcels | contracts | mobile | web | infra
```

### Branch Protection (Recommended)

Set up on GitHub → Settings → Branches → main:
- Require pull request reviews before merging (1 reviewer)
- Require status checks to pass (build, tests)
- Restrict pushes to `main`

---

*End of PROJECT.md — last updated September 2026*
