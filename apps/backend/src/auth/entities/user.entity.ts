import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  CITIZEN           = 'CITIZEN',
  SURVEYOR          = 'SURVEYOR',
  REGISTRAR         = 'REGISTRAR',
  LAND_ADMINISTRATOR = 'LAND_ADMINISTRATOR',
  GOVERNOR          = 'GOVERNOR',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'text', nullable: true })
  passwordHash: string | null;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ name: 'national_id', type: 'text', unique: true, nullable: true })
  nationalId: string | null;

  @Column({ type: 'text', nullable: true })
  phone: string | null;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.CITIZEN })
  role: UserRole;

  @Column({ name: 'wallet_address', type: 'varchar', length: 42, nullable: true })
  walletAddress: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
