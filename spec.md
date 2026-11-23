# Anagu — Definition of Done

This checklist tracks the requirements in `Anagu_Complete_Build_and_Test_Guide.pdf`.
The PDF remains the source of detailed procedures; this file records implementation and
verification evidence for the current checkout. A feature is not done because it is present
in a mock screen: it must use the configured service and pass its gate below.

## Selected product decisions

- The default browser UI is the supplied Google AI Studio design in `apps/anugu2`.
- The default web URL is `http://localhost:3000`; the NestJS API is
  `http://localhost:3001/api/v1`.
- The user selected Ethereum Sepolia for wallet/payment work. Test ETH only; never use
  mainnet funds. Land-title ownership changes must still go through the registry and
  statutory/registrar approvals required by the PDF.
- The PDF does not define a marketplace, sale price policy, currency, fees, or settlement
  recipient. Marketplace payments are an extension, not a PDF requirement. Any sale flow
  must escrow test ETH and release it only after the registry confirms the approved title
  transfer; no UI may report a payment or transfer as complete before chain confirmation.
- The supplied Vite UI uses the backend's local email/password authentication and JWT
  so account creation is immediate and does not depend on Supabase email-confirmation
  settings. Supabase remains an optional integration and is not the active browser login.

## Acceptance gates

| Gate | Required outcome | Current evidence/status |
|---|---|---|
| 0 — Environment | PostgreSQL + PostGIS, Redis, MinIO, MQTT, and Besu are reachable; backend starts; a test transaction confirms | **Partial.** PostGIS and Redis report healthy. MinIO/Besu/MQTT did not start because the configured MinIO image could not be pulled. |
| 1 — GIS | WGS84 polygon input, PostGIS `ST_IsValid`, overlap check with explicit metre tolerance, precise diagnostics; clean and edge-case test sets | **Partial.** GIS service tests passed previously; registration and GIS screens now submit coordinates to authenticated API endpoints. Full browser-to-database workflow and test-set measurements are not yet verified. |
| 2 — Blockchain/NFT | ERC-721 issuance, unique parcel/token linkage and spatial hash, registry-only transfers, Governor-only revocation on the two Land Use Act §28 grounds, revoked-token transfer rejection | **Partial.** All 36 local Hardhat tests passed. A public token-ID verification endpoint and UI are implemented; deployment to Sepolia and issuance/revocation lifecycle remain unverified. |
| 3A — Ownership oracle | Institutional/community lookup, documented exact/fuzzy matching, outcomes for verified/incomplete/conflict/legal-pending, persisted evidence | **Partial.** Oracle service and isolated tests exist. Its configured registry adapter is a development mock, not a live Nigerian institutional registry. |
| 3B — MQTT/offline | QoS 1 event publication, audit/monitoring, normal/degraded delivery tests, durable offline queue and reconnect replay | **Partial.** Backend MQTT module exists; broker could not be started and offline UI behavior is currently simulation-only. |
| 4 — Unified workflow | Submit → GIS → ownership oracle → legal review → registrar approval → on-chain registry/NFT → MQTT; RBAC and immutable audit for every transition | **Not complete.** The screens currently contain mock mutations; all transitions must use real API/chain results. |
| 5 — Evaluation | Fraud scenarios, 30+ proposed/baseline latency runs, storage layout comparison, all PDF result tables populated with measured data | **Partial.** Evaluation tests exist; tables must only contain measured results and must not present estimates as measurements. |
| UI — supplied design | All supplied screens, assets, animations and navigation retained; responsive app starts at the documented URL; auth is usable without demo credentials | **Partial.** The supplied Vite UI builds and type-checks; `/` returned HTTP 200 on port 3000. Direct local API authentication, empty-record views, an OpenStreetMap title explorer and a simplified certificate display are implemented. Workflow screens still need complete backend integration. |
| Auth/data | Direct account creation/login, backend JWT verification, role-safe access, persisted PostGIS/application/title data and documents | **Partial.** Registration/login now use local API JWTs without email confirmation; registration, private document uploads and several workflows still need end-to-end verification. |
| Marketplace extension | Seller listing and buyer payment signed in MetaMask on Sepolia; payment escrowed; registrar-authorized NFT transfer; seller paid only after confirmed transfer | **Not complete.** Requires a deployed/tested escrow contract, Sepolia deployment addresses, funded test wallet, and full UI/API integration. |

## Required PDF gates in order

### Gate 0 — environment

- [ ] `docker compose up -d` starts every declared infrastructure service.
- [x] PostgreSQL/PostGIS and Redis are healthy in the current local run.
- [ ] NestJS connects to PostGIS and `/api/docs` responds.
- [ ] A deployed contract accepts and confirms a transaction on the configured chain.

### Gate 1 — spatial verification

- [x] GIS service validates geometry and checks existing non-revoked parcels with a
  configurable overlap tolerance (`GIS_OVERLAP_TOLERANCE_METRES`, default `0.5` m).
- [x] GIS unit tests cover valid, invalid, insufficient-coordinate, overlap and hash paths.
- [x] Registration and GIS verification UI submit `[longitude, latitude]` coordinates to authenticated API endpoints; full e2e behavior remains unverified.
- [ ] Record clean and harder-case test-set counts, percentages, and the tolerance used.

### Gate 2 — blockchain and NFT

- [x] `LandTitleNFT` and `LandRegistry` contracts exist; direct owner transfers are
  disabled and registry transfers are role-gated.
- [x] Revocation contract tests cover Governor authorization and revoked-token behavior.
- [x] Public verification endpoint reads token ownership and revocation status from the configured NFT contract.
- [ ] Verify all six lifecycle/revocation cases on the configured deployed chain.
- [ ] Persist confirmed token ID, transaction hash, spatial hash and owner in the database.

### Gate 3 — oracle and messaging

- [x] Oracle criteria and outcome logic are documented in the service.
- [ ] Replace or explicitly configure the mock registry adapter for real institutional
  records; do not treat demo fixtures as production verification.
- [ ] Connect submissions to oracle outcomes and administrative review.
- [ ] Verify MQTT QoS 1 publication, monitoring/audit records, degraded connectivity and
  durable offline queue replay.
- [ ] Record actual topic schemas and serialized payload byte sizes.

### Gate 4 — integrated registration

- [ ] Persist application and parcel; run GIS and oracle before legal review.
- [ ] Gate approval, issuance, transfer and revocation by the correct backend role.
- [ ] Issue the NFT only after approval and update the database only after confirmation.
- [ ] Record each state transition in the audit trail and notify affected parties.
- [ ] Run end-to-end success, rejection, cancellation and pending-workflow cases.

### Gate 5 — evaluation

- [ ] Run and record every PDF fraud scenario with denominator, detected count and rate.
- [ ] Measure all five stages for at least 30 separate proposed and baseline transactions;
  report means, standard deviations, total and reduction.
- [ ] Compute on-chain and off-chain storage fields from the actual schema/layout and
  compare with the baseline for a stated parcel count.
- [ ] Complete the PDF result tables with real run data only.

## Verification commands

```bash
npm run web
npm run backend
npm run build
npm run lint:ui
npm run test:backend
npm run test:contracts
npm run component4
```

`npm run web` serves the supplied UI at `http://localhost:3000`. Do not mark the
definition of done complete until the corresponding acceptance gate has evidence above.
