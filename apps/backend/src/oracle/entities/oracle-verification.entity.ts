import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
} from 'typeorm';

@Entity('oracle_verifications')
export class OracleVerification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id' })
  applicationId: string;

  @Column()
  outcome: string;

  @Column('int')
  score: number;

  @Column({ type: 'jsonb', nullable: true })
  reasons: string[] | null;

  @Column({ name: 'raw_response', type: 'jsonb', nullable: true })
  rawResponse: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'verified_at' })
  verifiedAt: Date;
}
