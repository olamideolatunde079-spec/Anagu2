import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('institutions')
export class Institution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 32, unique: true })
  code: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ name: 'institution_type', type: 'text' })
  institutionType:
    | 'MINISTRY_OF_LANDS'
    | 'SURVEYOR_GENERAL'
    | 'JUDICIARY'
    | 'COMMUNITY_COUNCIL'
    | 'GIS_AGENCY';

  @Column({ name: 'state_id', type: 'uuid', nullable: true })
  stateId: string | null;

  @Column({ name: 'lga_id', type: 'uuid', nullable: true })
  lgaId: string | null;

  @Column({ name: 'contact_email', type: 'text', nullable: true })
  contactEmail: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('staff_profiles')
export class StaffProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @Column({ name: 'institution_id', type: 'uuid', nullable: true })
  institutionId: string | null;

  @Column({ name: 'jurisdiction_id', type: 'uuid', nullable: true })
  jurisdictionId: string | null;

  @Column({ name: 'staff_number', type: 'text', unique: true })
  staffNumber: string;

  @Column({ type: 'text' })
  designation: string;

  @Column({ name: 'license_number', type: 'text', unique: true, nullable: true })
  licenseNumber: string | null;

  @Column({ name: 'license_expires_at', type: 'date', nullable: true })
  licenseExpiresAt: string | null;

  @Column({ name: 'appointment_date', type: 'date', nullable: true })
  appointmentDate: string | null;

  @Column({ name: 'is_authorized_signer', default: false })
  isAuthorizedSigner: boolean;

  @Column({ type: 'text', default: 'ACTIVE' })
  status: 'ACTIVE' | 'SUSPENDED' | 'RETIRED' | 'REVOKED';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
