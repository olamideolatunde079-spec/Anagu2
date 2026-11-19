import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('marketplace_listings')
export class MarketplaceListing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'listing_ref', type: 'varchar', length: 64, unique: true })
  listingRef: string;

  @Column({ name: 'land_title_id', type: 'uuid' })
  landTitleId: string;

  @Column({ name: 'parcel_id', type: 'uuid' })
  parcelId: string;

  @Column({ name: 'seller_user_id', type: 'uuid' })
  sellerUserId: string;

  @Column({ name: 'seller_address', length: 42 })
  sellerAddress: string;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'asking_price', type: 'numeric', precision: 24, scale: 6 })
  askingPrice: string;

  @Column({ type: 'varchar', length: 16, default: 'POL' })
  currency: string;

  @Column({ name: 'chain_id', type: 'bigint', default: '80002' })
  chainId: string;

  @Column({ type: 'text', default: 'DRAFT' })
  status: 'DRAFT' | 'ACTIVE' | 'UNDER_OFFER' | 'ESCROW_LOCKED' | 'SOLD' | 'CANCELLED' | 'SUSPENDED';

  @Column({ name: 'is_title_verified', default: true })
  isTitleVerified: boolean;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('land_transfers')
export class LandTransfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'transfer_ref', type: 'varchar', length: 64, unique: true })
  transferRef: string;

  @Column({ name: 'land_title_id', type: 'uuid' })
  landTitleId: string;

  @Column({ name: 'parcel_id', type: 'uuid' })
  parcelId: string;

  @Column({ name: 'seller_user_id', type: 'uuid', nullable: true })
  sellerUserId: string | null;

  @Column({ name: 'seller_address', length: 42 })
  sellerAddress: string;

  @Column({ name: 'buyer_user_id', type: 'uuid', nullable: true })
  buyerUserId: string | null;

  @Column({ name: 'buyer_address', length: 42 })
  buyerAddress: string;

  @Column({ name: 'registrar_id', type: 'uuid', nullable: true })
  registrarId: string | null;

  @Column({ name: 'consideration_amount', type: 'numeric', precision: 24, scale: 6, nullable: true })
  considerationAmount: string | null;

  @Column({ type: 'varchar', length: 16, default: 'POL' })
  currency: string;

  @Column({ name: 'escrow_tx_hash', type: 'varchar', length: 66, nullable: true })
  escrowTxHash: string | null;

  @Column({ name: 'settlement_tx_hash', type: 'varchar', length: 66, nullable: true })
  settlementTxHash: string | null;

  @Column({ name: 'blockchain_tx_id', type: 'uuid', nullable: true })
  blockchainTxId: string | null;

  @Column({ type: 'text', default: 'REQUESTED' })
  status:
    | 'REQUESTED'
    | 'ESCROWED'
    | 'LEGAL_CLEARED'
    | 'REGISTRAR_APPROVED'
    | 'COMPLETED'
    | 'REJECTED'
    | 'CANCELLED';

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @CreateDateColumn({ name: 'requested_at' })
  requestedAt: Date;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('payment_transactions')
export class PaymentTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'payment_ref', type: 'varchar', length: 64, unique: true })
  paymentRef: string;

  @Column({ name: 'listing_id', type: 'uuid', nullable: true })
  listingId: string | null;

  @Column({ name: 'land_transfer_id', type: 'uuid', nullable: true })
  landTransferId: string | null;

  @Column({ name: 'buyer_user_id', type: 'uuid', nullable: true })
  buyerUserId: string | null;

  @Column({ name: 'seller_user_id', type: 'uuid', nullable: true })
  sellerUserId: string | null;

  @Column({ name: 'payer_address', length: 42 })
  payerAddress: string;

  @Column({ name: 'payee_address', length: 42 })
  payeeAddress: string;

  @Column({ name: 'escrow_contract_address', length: 42, nullable: true })
  escrowContractAddress: string | null;

  @Column({ name: 'escrow_status', type: 'text', default: 'INITIATED' })
  escrowStatus: 'INITIATED' | 'ESCROWED' | 'RELEASE_PENDING' | 'SETTLED' | 'REFUNDED' | 'DISPUTED';

  @Column({ name: 'gross_amount', type: 'numeric', precision: 24, scale: 6 })
  grossAmount: string;

  @Column({ type: 'varchar', length: 16, default: 'POL' })
  currency: string;

  @Column({ name: 'chain_id', type: 'bigint', default: '80002' })
  chainId: string;

  @Column({ name: 'escrow_tx_hash', type: 'varchar', length: 66, nullable: true })
  escrowTxHash: string | null;

  @Column({ name: 'blockchain_tx_id', type: 'uuid', nullable: true })
  blockchainTxId: string | null;

  @CreateDateColumn({ name: 'initiated_at' })
  initiatedAt: Date;

  @Column({ name: 'escrowed_at', type: 'timestamptz', nullable: true })
  escrowedAt: Date | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('platform_commissions')
export class PlatformCommission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'payment_transaction_id', type: 'uuid', unique: true })
  paymentTransactionId: string;

  @Column({ name: 'commission_rate_bps', type: 'integer' })
  commissionRateBps: number;

  @Column({ name: 'commission_amount', type: 'numeric', precision: 24, scale: 6 })
  commissionAmount: string;

  @Column({ type: 'varchar', length: 16, default: 'POL' })
  currency: string;

  @Column({ name: 'treasury_address', length: 42, nullable: true })
  treasuryAddress: string | null;

  @Column({ type: 'text', default: 'ACCRUED' })
  status: 'ACCRUED' | 'COLLECTED' | 'WAIVED' | 'REVERSED';

  @Column({ name: 'collected_at', type: 'timestamptz', nullable: true })
  collectedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('settlement_records')
export class SettlementRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'settlement_ref', type: 'varchar', length: 64, unique: true })
  settlementRef: string;

  @Column({ name: 'payment_transaction_id', type: 'uuid', unique: true })
  paymentTransactionId: string;

  @Column({ name: 'land_transfer_id', type: 'uuid', nullable: true })
  landTransferId: string | null;

  @Column({ name: 'net_seller_amount', type: 'numeric', precision: 24, scale: 6 })
  netSellerAmount: string;

  @Column({ name: 'commission_amount', type: 'numeric', precision: 24, scale: 6, default: '0' })
  commissionAmount: string;

  @Column({ type: 'varchar', length: 16, default: 'POL' })
  currency: string;

  @Column({ name: 'settlement_tx_hash', type: 'varchar', length: 66, nullable: true })
  settlementTxHash: string | null;

  @Column({ name: 'blockchain_tx_id', type: 'uuid', nullable: true })
  blockchainTxId: string | null;

  @Column({ type: 'text', default: 'PENDING' })
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';

  @Column({ name: 'settled_at', type: 'timestamptz', nullable: true })
  settledAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
