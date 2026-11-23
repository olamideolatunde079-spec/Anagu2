import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ParcelsService } from './parcels.service';
import { ParcelsController } from './parcels.controller';
import { BlockchainController } from '../blockchain/blockchain.controller';
import { MarketplaceController } from '../marketplace/marketplace.controller';
import { UserRole } from '../auth/entities/user.entity';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

describe('ParcelsService & Statutory RBAC Separation', () => {
  let service: ParcelsService;
  let appRepo: any;
  let parcelRepo: any;
  let historyRepo: any;
  let legalReviewRepo: any;
  let gisService: any;
  let auditService: any;
  let mqttService: any;
  let dataSource: any;

  beforeEach(() => {
    appRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((x) => ({ id: 'app-1', ...x })),
      save: jest.fn(async (x) => x),
    };
    parcelRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
    };
    historyRepo = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
      find: jest.fn().mockResolvedValue([]),
    };
    legalReviewRepo = {
      create: jest.fn((x) => ({ id: 'leg-1', ...x })),
      save: jest.fn(async (x) => x),
      find: jest.fn().mockResolvedValue([]),
    };
    gisService = {
      verifyParcel: jest.fn(),
      verifyAndRecordParcel: jest.fn(),
      getVerificationsByApplication: jest.fn().mockResolvedValue([]),
    };
    auditService = { log: jest.fn().mockResolvedValue({}) };
    mqttService = {
      publishSpatialVerified: jest.fn().mockResolvedValue(undefined),
      publishApproved: jest.fn().mockResolvedValue(undefined),
      publishRejected: jest.fn().mockResolvedValue(undefined),
      publish: jest.fn().mockResolvedValue(undefined),
    };
    dataSource = {
      query: jest.fn().mockResolvedValue([{ id: 'parcel-1' }]),
    };

    service = new ParcelsService(
      appRepo,
      parcelRepo,
      historyRepo,
      legalReviewRepo,
      gisService,
      auditService,
      mqttService,
      dataSource,
    );
  });

  it('prevents a citizen from reading another citizen application', async () => {
    appRepo.findOne.mockResolvedValue({
      id: 'app-other',
      applicantId: 'user-owner',
      status: 'SUBMITTED',
    });

    await expect(
      service.findApplicationByIdAuthorized('app-other', 'user-attacker', UserRole.CITIZEN),
    ).rejects.toThrow(ForbiddenException);
  });

  it('requires LEGAL_VERIFIED before Registrar can approve application', async () => {
    appRepo.findOne.mockResolvedValue({
      id: 'app-1',
      applicantId: 'user-1',
      status: 'SPATIAL_VERIFIED',
    });

    await expect(service.approveApplication('app-1', 'reg-1')).rejects.toThrow(BadRequestException);
  });

  it('transitions LEGAL_VERIFIED application to APPROVED and logs history + audit', async () => {
    appRepo.findOne.mockResolvedValue({
      id: 'app-1',
      applicantId: 'user-1',
      parcelId: 'parcel-1',
      status: 'LEGAL_VERIFIED',
    });

    const updated = await service.approveApplication('app-1', 'reg-1');
    expect(updated.status).toBe('APPROVED');
    expect(updated.registrarId).toBe('reg-1');
    expect(historyRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ fromStatus: 'LEGAL_VERIFIED', toStatus: 'APPROVED' }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'APPROVED', actorRole: UserRole.REGISTRAR }),
    );
  });

  it('allows applicant to cancel pending application but blocks cancelling NFT_ISSUED', async () => {
    appRepo.findOne.mockResolvedValue({
      id: 'app-1',
      applicantId: 'user-1',
      status: 'SPATIAL_VERIFIED',
    });
    const cancelled = await service.cancelApplication('app-1', 'user-1');
    expect(cancelled.status).toBe('CANCELLED');

    appRepo.findOne.mockResolvedValue({
      id: 'app-2',
      applicantId: 'user-1',
      status: 'NFT_ISSUED',
    });
    await expect(service.cancelApplication('app-2', 'user-1')).rejects.toThrow(BadRequestException);
  });

  it('enforces statutory separation of duties: LAND_ADMINISTRATOR excluded from approvals, NFT issuance, revocation, and transfer approval', () => {
    const reflector = new Reflector();

    const approveRoles = reflector.get<UserRole[]>(ROLES_KEY, ParcelsController.prototype.approve);
    const legalRoles = reflector.get<UserRole[]>(ROLES_KEY, ParcelsController.prototype.legalReview);
    const issueRoles = reflector.get<UserRole[]>(ROLES_KEY, BlockchainController.prototype.issueTitle);
    const revokeRoles = reflector.get<UserRole[]>(ROLES_KEY, BlockchainController.prototype.revokeTitle);
    const transferApproveRoles = reflector.get<UserRole[]>(ROLES_KEY, MarketplaceController.prototype.approveTransfer);

    expect(approveRoles).toEqual([UserRole.REGISTRAR]);
    expect(legalRoles).toEqual([UserRole.REGISTRAR]);
    expect(issueRoles).toEqual([UserRole.REGISTRAR]);
    expect(revokeRoles).toEqual([UserRole.GOVERNOR]);
    expect(transferApproveRoles).toEqual([UserRole.REGISTRAR]);

    expect(approveRoles).not.toContain(UserRole.LAND_ADMINISTRATOR);
    expect(issueRoles).not.toContain(UserRole.LAND_ADMINISTRATOR);
    expect(revokeRoles).not.toContain(UserRole.LAND_ADMINISTRATOR);
    expect(transferApproveRoles).not.toContain(UserRole.LAND_ADMINISTRATOR);
  });
});
