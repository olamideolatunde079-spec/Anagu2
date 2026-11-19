import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('blockchain_transactions')
export class BlockchainTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'chain_id', type: 'bigint', default: '80002' })
  chainId: string;

  @Column({ name: 'network_name', type: 'text', default: 'polygon_amoy' })
  networkName: string;

  @Column({ name: 'contract_address', length: 42 })
  contractAddress: string;

  @Column({ name: 'tx_hash', length: 66, unique: true })
  txHash: string;

  @Column({ name: 'block_number', type: 'bigint', nullable: true })
  blockNumber: string | null;

  @Column({ name: 'block_hash', length: 66, nullable: true })
  blockHash: string | null;

  @Column({ name: 'tx_type', type: 'text' })
  txType:
    | 'ISSUE_TITLE'
    | 'TRANSFER_TITLE'
    | 'REVOKE_TITLE'
    | 'ESCROW_DEPOSIT'
    | 'ESCROW_RELEASE'
    | 'ESCROW_REFUND';

  @Column({ type: 'text', default: 'PENDING' })
  status: 'PENDING' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED' | 'REVERTED';

  @Column({ name: 'from_address', length: 42 })
  fromAddress: string;

  @Column({ name: 'to_address', length: 42, nullable: true })
  toAddress: string | null;

  @Column({ name: 'gas_used', type: 'bigint', nullable: true })
  gasUsed: string | null;

  @Column({ name: 'effective_gas_price_wei', type: 'numeric', precision: 78, scale: 0, nullable: true })
  effectiveGasPriceWei: string | null;

  @Column({ type: 'bigint', nullable: true })
  nonce: string | null;

  @Column({ name: 'related_entity_type', type: 'text', nullable: true })
  relatedEntityType: string | null;

  @Column({ name: 'related_entity_id', type: 'uuid', nullable: true })
  relatedEntityId: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'submitted_at' })
  submittedAt: Date;

  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true })
  confirmedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('title_ownership_history')
export class TitleOwnershipHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'land_title_id', type: 'uuid' })
  landTitleId: string;

  @Column({ name: 'owner_user_id', type: 'uuid', nullable: true })
  ownerUserId: string | null;

  @Column({ name: 'owner_address', length: 42 })
  ownerAddress: string;

  @Column({ name: 'ownership_share_bps', type: 'integer', default: 10000 })
  ownershipShareBps: number;

  @Column({ name: 'acquisition_type', type: 'text', default: 'ORIGINAL_GRANT' })
  acquisitionType: 'ORIGINAL_GRANT' | 'TRANSFER' | 'INHERITANCE' | 'COURT_ORDER';

  @Column({ name: 'tx_hash', length: 66, nullable: true })
  txHash: string | null;

  @Column({ name: 'is_current', default: true })
  isCurrent: boolean;

  @CreateDateColumn({ name: 'acquired_at' })
  acquiredAt: Date;

  @Column({ name: 'relinquished_at', type: 'timestamptz', nullable: true })
  relinquishedAt: Date | null;
}
