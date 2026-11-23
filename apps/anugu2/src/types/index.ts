export type UserRole = 
  | 'citizen'
  | 'surveyor'
  | 'registrar'
  | 'admin'
  | 'governor'
  | 'sysadmin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  nationalId: string;
  walletAddress: string;
  avatarUrl: string;
  organization?: string;
  licenseNumber?: string;
  verified: boolean;
  phone?: string;
  address?: string;
}

export type ParcelStatus = 
  | 'verified'
  | 'pending_survey'
  | 'community_review'
  | 'registrar_approval'
  | 'revoked'
  | 'disputed';

export type LandUse = 'Residential' | 'Commercial' | 'Agricultural' | 'Industrial' | 'Mixed Use' | 'Government Reserve';

export interface Coordinate {
  id: string;
  beaconNumber: string;
  lat: number;
  lng: number;
  easting?: number;
  northing?: number;
  elevation?: number;
}

export interface Parcel {
  id: string;
  titleNumber: string; // e.g., C-OF-O-2026-8849
  tokenHash: string; // e.g. 0x8f2a...
  ownerName: string;
  ownerId: string;
  ownerNationalId: string;
  state: string;
  lga: string; // Local Government Area
  district: string;
  landUse: LandUse;
  sizeSqm: number;
  sizeHectares: number;
  status: ParcelStatus;
  dateRegistered: string;
  expiryDate?: string;
  coordinates: Coordinate[];
  surveyPlanNumber: string;
  surveyorName: string;
  marketValuation: number;
  encumbrances: string[];
  disputeNotes?: string;
  ipfsDocumentHash: string;
  certificateIssued: boolean;
  blockNumber: number;
}

export type TenureType = 'Statutory' | 'Customary';

export interface LandApplication {
  id: string;
  applicationNumber: string;
  applicantName: string;
  applicantId: string;
  applicantPhone: string;
  applicantEmail: string;
  tenureType?: TenureType;
  state: string;
  lga: string;
  district: string;
  landUse: LandUse;
  estimatedAreaSqm: number;
  northNeighbor?: string;
  southNeighbor?: string;
  eastNeighbor?: string;
  westNeighbor?: string;
  surveyorSurconNo?: string;
  status: 
    | 'submitted'
    | 'survey_assigned'
    | 'survey_completed'
    | 'community_attestation'
    | 'registrar_review'
    | 'approved'
    | 'rejected';
  dateSubmitted: string;
  lastUpdated: string;
  assignedSurveyor?: string;
  surveyReportDate?: string;
  attestationsCount: number;
  requiredAttestations: number;
  notes: string;
  documents: {
    name: string;
    type: string;
    size: string;
    uploadedAt: string;
  }[];
}

export interface BlockchainBlock {
  blockNumber: number;
  hash: string;
  parentHash: string;
  timestamp: string;
  transactionsCount: number;
  validator: string;
  gasUsed: string;
  status: 'finalized' | 'verifying';
}

export interface BlockchainTransaction {
  id: string;
  hash: string;
  type: 'TITLE_REGISTRATION' | 'TRANSFER_APPROVAL' | 'SURVEY_ATTESTATION' | 'REVOCATION_ORDER' | 'COMMUNITY_SIGN' | 'METADATA_UPDATE';
  blockNumber: number;
  timestamp: string;
  from: string;
  to: string;
  parcelTitle: string;
  parcelId: string;
  status: 'confirmed' | 'pending' | 'reverted';
  gasFee: string;
  signerRole: UserRole;
  signature: string;
}

export interface SurveyJob {
  id: string;
  jobCode: string;
  parcelId: string;
  applicantName: string;
  location: string;
  landUse: string;
  estimatedAreaSqm: number;
  scheduledDate: string;
  status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'revision_requested';
  surveyorNotes?: string;
  beaconsPlaced?: number;
  cadastralPlanRef?: string;
}

export interface CommunityAttestation {
  id: string;
  parcelId: string;
  parcelTitle: string;
  applicantName: string;
  location: string;
  tenureType?: TenureType;
  attestationDeadline: string;
  status: 'open' | 'attested' | 'contested';
  neighborAttestations: {
    neighborName: string;
    boundarySide: 'North' | 'South' | 'East' | 'West';
    status: 'confirmed' | 'disputed' | 'pending';
    comment?: string;
    date?: string;
  }[];
  publicDisputes: {
    claimant: string;
    reason: string;
    date: string;
    status: 'under_investigation' | 'resolved';
  }[];
}

export type StatutoryRevocationReason = 
  | 'Overriding Public Interest'
  | 'Breach of Statutory Condition'
  | 'Breach of C of O Terms'
  | 'Statutory Infrastructure Acquisition';

export type OracleOutcome = 
  | 'Successfully Verified'
  | 'Incomplete Supporting Documents'
  | 'Ownership Information Conflict'
  | 'Legal Verification Pending';

export type NetworkDegradationMode = 'normal' | 'moderate' | 'severe';

export interface RevocationRecord {
  id: string;
  orderNumber: string;
  parcelId: string;
  parcelTitle: string;
  previousOwner: string;
  revocationReason: StatutoryRevocationReason;
  gazetteNoticeNumber: string;
  effectiveDate: string;
  compensationStatus: 'Determined' | 'In Arbitration' | 'Paid' | 'Not Applicable';
  compensationAmount: number;
  signedBy: string;
  status: 'executed' | 'in_notice_period' | 'appealed';
  sectionCitation?: string;
  txHash?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: UserRole;
  action: string;
  targetId: string;
  targetType: 'Parcel' | 'Application' | 'Revocation' | 'User' | 'System';
  details: string;
  ipAddress: string;
  hash: string;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  actionLink?: string;
}
