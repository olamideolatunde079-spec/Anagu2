import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('land_titles')
export class LandTitle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'token_id', type: 'bigint', unique: true })
  tokenId: string;

  @Column({ name: 'parcel_id' })
  parcelId: string;

  @Column({ name: 'application_id' })
  applicationId: string;

  @Column({ name: 'owner_address', length: 42 })
  ownerAddress: string;

  @Column({ name: 'owner_user_id', type: 'uuid', nullable: true })
  ownerUserId: string | null;

  @Column({ name: 'tx_hash', length: 66 })
  txHash: string;

  @Column({ name: 'block_number', nullable: true, type: 'bigint' })
  blockNumber: string | null;

  @Column({ name: 'token_uri', type: 'text', nullable: true })
  tokenUri: string | null;

  @Column({ name: 'is_revoked', default: false })
  isRevoked: boolean;

  @Column({ name: 'revocation_tx', type: 'varchar', length: 66, nullable: true })
  revocationTx: string | null;

  @Column({
    name: 'revocation_ground',
    type: 'enum',
    enum: ['OVERRIDING_PUBLIC_INTEREST', 'BREACH_OF_STATUTORY_CONDITION'],
    enumName: 'revocation_ground',
    nullable: true,
  })
  revocationGround: string | null;

  @Column({ name: 'revoked_by_address', type: 'varchar', length: 42, nullable: true })
  revokedByAddress: string | null;

  @CreateDateColumn({ name: 'issued_at' })
  issuedAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;
}
