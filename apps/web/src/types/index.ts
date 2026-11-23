/**
 * Anagu — Shared TypeScript types for the web application.
 *
 * Mirrors entities and enums from the NestJS backend.
 * Keep in sync with:
 *  - apps/backend/src/auth/entities/user.entity.ts
 *  - apps/backend/src/blockchain/entities/land-title.entity.ts
 *  - apps/backend/src/oracle/entities/oracle-verification.entity.ts
 *  - apps/backend/src/mqtt/entities/mqtt-event.entity.ts
 *  - apps/backend/src/audit/entities/audit-event.entity.ts
 */

// ── Enums ─────────────────────────────────────────────────────────────────────

export enum UserRole {
  CITIZEN            = 'CITIZEN',
  SURVEYOR           = 'SURVEYOR',
  REGISTRAR          = 'REGISTRAR',
  LAND_ADMINISTRATOR = 'LAND_ADMINISTRATOR',
  GOVERNOR           = 'GOVERNOR',
}

export enum ApplicationStatus {
  SUBMITTED              = 'SUBMITTED',
  SPATIAL_VERIFIED       = 'SPATIAL_VERIFIED',
  OWNERSHIP_VERIFIED     = 'OWNERSHIP_VERIFIED',
  LEGAL_VERIFIED         = 'LEGAL_VERIFIED',
  APPROVED               = 'APPROVED',
  BLOCKCHAIN_REGISTERED  = 'BLOCKCHAIN_REGISTERED',
  NFT_ISSUED             = 'NFT_ISSUED',
  COMPLETED              = 'COMPLETED',
  REJECTED               = 'REJECTED',
  CANCELLED              = 'CANCELLED',
}

export enum ParcelStatus {
  PENDING  = 'PENDING',
  ACTIVE   = 'ACTIVE',
  REVOKED  = 'REVOKED',
  DISPUTED = 'DISPUTED',
}

/** Nigeria's Land Use Act (1978), Section 28 — statutory revocation grounds. */
export enum RevocationGround {
  OverridingPublicInterest    = 0,
  BreachOfStatutoryCondition  = 1,
}

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface Application {
  id:                 string;
  parcelId:           string;
  applicantId:        string;
  ownerName:          string;
  nationalId:         string;
  surveyPlanNumber?:  string | null;
  communityWitnesses?: string[] | null;
  legalClearanceHash?: string | null;
  status:             ApplicationStatus;
  rejectionStage?:    string | null;
  rejectionReason?:   string | null;
  registrarId?:       string | null;
  approvedAt?:        string | null;  // ISO datetime
  createdAt:          string;
  updatedAt:          string;
}

export interface LandTitle {
  id:                string;
  tokenId:           string;         // ERC-721 token ID (BigInt serialised as string)
  parcelId:          string;
  applicationId:     string;
  ownerAddress:      string;         // Ethereum address
  ownerUserId?:      string | null;
  txHash:            string;         // issuance tx hash
  blockNumber?:      string | null;
  tokenUri?:         string | null;
  isRevoked:         boolean;
  revocationTx?:     string | null;
  revocationGround?: 'OVERRIDING_PUBLIC_INTEREST' | 'BREACH_OF_STATUTORY_CONDITION' | null;
  revokedByAddress?: string | null;
  issuedAt:          string;
  revokedAt?:        string | null;
}

export interface AuditEvent {
  id:           string;
  entityType:   'application' | 'parcel' | 'title' | 'user';
  entityId:     string;
  eventType:    string;
  fromStatus?:  string | null;
  toStatus?:    string | null;
  actorRole?:   UserRole | null;
  actorId:      string;
  actorAddress?: string | null;
  metadata?:    Record<string, unknown> | null;
  ipAddress?:   string | null;
  createdAt:    string;
}

export interface OracleVerificationResult {
  id?:           string;
  applicationId: string;
  outcome:       'VERIFIED' | 'INCOMPLETE_DOCS' | 'OWNERSHIP_CONFLICT' | 'LEGAL_PENDING';
  score:         number;      // 0–100
  reasons:       string[];
  detail?:       Record<string, unknown>;
  verifiedAt?:   string;
}

export interface SpatialValidationResult {
  valid:                boolean;
  reason?:              'INVALID_GEOMETRY' | 'OVERLAPPING_PARCEL' | 'INSUFFICIENT_COORDINATES';
  overlappingParcelId?: string;
  diagnosticMessage?:   string;
  spatialHash?:         string;   // hex — used as NFT spatialHash
  wkt?:                 string;
}

export interface MqttEvent {
  id?:           string;
  topic:         string;
  payload:       Record<string, unknown>;
  qos:           0 | 1 | 2;
  payloadBytes?: number;
  delivered?:    boolean;
  publishedAt?:  string;
  deliveredAt?:  string | null;
}

// ── Pipeline stages ───────────────────────────────────────────────────────────

/**
 * The 8 stages of a complete land registration, in order.
 * Used in the pipeline progress UI.
 */
export const PipelineStage = [
  { key: ApplicationStatus.SUBMITTED,             label: 'Application Submitted',       step: 1 },
  { key: ApplicationStatus.SPATIAL_VERIFIED,      label: 'Spatial Verification',        step: 2 },
  { key: ApplicationStatus.OWNERSHIP_VERIFIED,    label: 'Ownership Verification',      step: 3 },
  { key: ApplicationStatus.LEGAL_VERIFIED,        label: 'Legal Verification',          step: 4 },
  { key: ApplicationStatus.APPROVED,              label: 'Registrar Approval',          step: 5 },
  { key: ApplicationStatus.BLOCKCHAIN_REGISTERED, label: 'Blockchain Registration',     step: 6 },
  { key: ApplicationStatus.NFT_ISSUED,            label: 'NFT Title Issuance',          step: 7 },
  { key: ApplicationStatus.COMPLETED,             label: 'Title Issued — Completed',    step: 8 },
] as const;

export type PipelineStageKey = typeof PipelineStage[number]['key'];
