import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { User, UserRole } from '../auth/entities/user.entity';
import { AccountVerification } from './entities/account-verification.entity';
import { Role, UserRoleAssignment } from './entities/rbac.entity';
import { Institution, StaffProfile } from './entities/staff.entity';
import { Jurisdiction, Lga, State } from './entities/jurisdiction.entity';
import { AuditService } from '../audit/audit.service';
import {
  CreateStaffProfileDto,
  ReviewVerificationDto,
  SubmitVerificationDto,
  UpdateProfileDto,
  UpdateUserRoleDto,
} from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(AccountVerification)
    private readonly verifRepo: Repository<AccountVerification>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(UserRoleAssignment)
    private readonly userRoleRepo: Repository<UserRoleAssignment>,
    @InjectRepository(Institution)
    private readonly institutionRepo: Repository<Institution>,
    @InjectRepository(StaffProfile)
    private readonly staffRepo: Repository<StaffProfile>,
    @InjectRepository(State) private readonly stateRepo: Repository<State>,
    @InjectRepository(Lga) private readonly lgaRepo: Repository<Lga>,
    @InjectRepository(Jurisdiction)
    private readonly jurisdictionRepo: Repository<Jurisdiction>,
    @Optional() private readonly auditService?: AuditService,
  ) {}

  async getMe(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const verifications = await this.verifRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    const staffProfile = await this.staffRepo.findOne({ where: { userId } });
    const { passwordHash: _, ...safeUser } = user;
    return { ...safeUser, verifications, staffProfile };
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.nationalId && dto.nationalId !== user.nationalId) {
      const conflict = await this.userRepo.findOne({ where: { nationalId: dto.nationalId } });
      if (conflict && conflict.id !== userId) {
        throw new ConflictException('National ID is already linked to another account.');
      }
      user.nationalId = dto.nationalId;
    }

    if (dto.fullName !== undefined) user.fullName = dto.fullName.trim();
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.walletAddress !== undefined) user.walletAddress = dto.walletAddress;

    await this.userRepo.save(user);
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  async submitVerification(userId: string, dto: SubmitVerificationDto) {
    const referenceHash = crypto
      .createHash('sha256')
      .update(dto.referenceValue.trim())
      .digest('hex');

    const record = this.verifRepo.create({
      userId,
      verificationType: dto.verificationType,
      status: 'PENDING',
      referenceHash,
      notes: dto.notes ?? null,
    });
    const saved = await this.verifRepo.save(record);

    await this.auditService?.log({
      entityType: 'account_verification',
      entityId: saved.id,
      eventType: 'KYC_SUBMITTED',
      toStatus: 'PENDING',
      actorId: userId,
      metadata: { verificationType: dto.verificationType },
    });

    return saved;
  }

  async reviewVerification(
    verificationId: string,
    dto: ReviewVerificationDto,
    reviewerId: string,
    reviewerRole: UserRole,
  ) {
    const record = await this.verifRepo.findOne({ where: { id: verificationId } });
    if (!record) throw new NotFoundException('Verification record not found');

    const previous = record.status;
    record.status = dto.status;
    record.verifiedBy = reviewerId;
    record.verifiedAt = new Date();
    if (dto.notes !== undefined) record.notes = dto.notes;
    await this.verifRepo.save(record);

    if (record.verificationType === 'EMAIL' && dto.status === 'VERIFIED') {
      await this.userRepo.update(record.userId, { emailVerified: true });
    }

    await this.auditService?.log({
      entityType: 'account_verification',
      entityId: record.id,
      eventType: `KYC_${dto.status}`,
      fromStatus: previous,
      toStatus: dto.status,
      actorRole: reviewerRole,
      actorId: reviewerId,
    });

    return record;
  }

  async listUsers(role?: UserRole) {
    const users = await this.userRepo.find({
      where: role ? { role } : {},
      order: { createdAt: 'DESC' },
      take: 200,
    });
    return users.map(({ passwordHash: _, ...safe }) => safe);
  }

  async updateUserRole(targetUserId: string, dto: UpdateUserRoleDto, adminId: string) {
    const user = await this.userRepo.findOne({ where: { id: targetUserId } });
    if (!user) throw new NotFoundException('User not found');
    const previousRole = user.role;

    user.role = dto.role;
    await this.userRepo.save(user);

    const roleEntity = await this.roleRepo.findOne({ where: { code: dto.role } });
    if (roleEntity) {
      await this.userRoleRepo.update(
        { userId: targetUserId, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
      await this.userRoleRepo.save(
        this.userRoleRepo.create({
          userId: targetUserId,
          roleId: roleEntity.id,
          jurisdictionId: dto.jurisdictionId ?? null,
          grantedBy: adminId,
        }),
      );
    }

    await this.auditService?.log({
      entityType: 'user',
      entityId: user.id,
      eventType: 'USER_ROLE_UPDATED',
      fromStatus: previousRole,
      toStatus: dto.role,
      actorRole: UserRole.LAND_ADMINISTRATOR,
      actorId: adminId,
      metadata: { jurisdictionId: dto.jurisdictionId ?? null },
    });

    const { passwordHash: _, ...safe } = user;
    return safe;
  }

  async listStaff() {
    const [staff, institutions] = await Promise.all([
      this.staffRepo.find({ order: { createdAt: 'DESC' } }),
      this.institutionRepo.find({ where: { isActive: true }, order: { name: 'ASC' } }),
    ]);
    return { staff, institutions };
  }

  async createStaffProfile(dto: CreateStaffProfileDto, actorId: string) {
    const user = await this.userRepo.findOne({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('Target user not found');

    const existing = await this.staffRepo.findOne({ where: { userId: dto.userId } });
    if (existing) {
      throw new BadRequestException('Staff profile already exists for this user.');
    }

    const staff = this.staffRepo.create({
      userId: dto.userId,
      institutionId: dto.institutionId ?? null,
      jurisdictionId: dto.jurisdictionId ?? null,
      staffNumber: dto.staffNumber,
      designation: dto.designation,
      licenseNumber: dto.licenseNumber ?? null,
      isAuthorizedSigner: dto.isAuthorizedSigner ?? false,
      status: 'ACTIVE',
    });
    const saved = await this.staffRepo.save(staff);

    await this.auditService?.log({
      entityType: 'staff_profile',
      entityId: saved.id,
      eventType: 'STAFF_PROFILE_CREATED',
      actorRole: UserRole.LAND_ADMINISTRATOR,
      actorId,
      metadata: { staffNumber: dto.staffNumber, targetUserId: dto.userId },
    });

    return saved;
  }

  async listStates() {
    return this.stateRepo.find({ order: { name: 'ASC' } });
  }

  async listLgasByState(stateId: string) {
    return this.lgaRepo.find({ where: { stateId }, order: { name: 'ASC' } });
  }

  async listJurisdictions() {
    return this.jurisdictionRepo.find({ where: { isActive: true }, order: { name: 'ASC' } });
  }
}
