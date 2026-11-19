import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { UserRole } from '../auth/entities/user.entity';

describe('MarketplaceService', () => {
  let service: MarketplaceService;
  let listingRepo: any;
  let transferRepo: any;
  let paymentRepo: any;
  let commissionRepo: any;
  let settlementRepo: any;
  let titleRepo: any;
  let dataSource: any;
  let auditService: any;
  let mqttService: any;

  beforeEach(() => {
    listingRepo = {
      findOne: jest.fn(),
      create: jest.fn((x) => ({ id: 'listing-1', ...x })),
      save: jest.fn(async (x) => x),
      update: jest.fn(),
    };
    transferRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((x) => ({ id: 'transfer-1', ...x })),
      save: jest.fn(async (x) => x),
    };
    paymentRepo = {
      findOne: jest.fn(),
      create: jest.fn((x) => ({ id: 'pay-1', ...x })),
      save: jest.fn(async (x) => x),
    };
    commissionRepo = {
      findOne: jest.fn(),
      create: jest.fn((x) => ({ id: 'comm-1', ...x })),
      save: jest.fn(async (x) => x),
    };
    settlementRepo = {
      create: jest.fn((x) => ({ id: 'settle-1', ...x })),
      save: jest.fn(async (x) => x),
    };
    titleRepo = { findOne: jest.fn() };
    dataSource = { query: jest.fn().mockResolvedValue([{ config_value: { bps: 250 } }]) };
    auditService = { log: jest.fn().mockResolvedValue({}) };
    mqttService = { publish: jest.fn().mockResolvedValue(undefined) };

    service = new MarketplaceService(
      listingRepo,
      transferRepo,
      paymentRepo,
      commissionRepo,
      settlementRepo,
      titleRepo,
      dataSource,
      auditService,
      mqttService,
    );
  });

  it('rejects listing creation for revoked titles', async () => {
    titleRepo.findOne.mockResolvedValue({
      id: 'title-1',
      isRevoked: true,
      ownerUserId: 'seller-1',
    });

    await expect(
      service.createListing(
        { landTitleId: 'title-1', title: 'Revoked Parcel', askingPrice: 10000 },
        'seller-1',
        UserRole.CITIZEN,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('blocks non-owners from creating a listing for someone else title', async () => {
    titleRepo.findOne.mockResolvedValue({
      id: 'title-1',
      isRevoked: false,
      ownerUserId: 'real-owner',
    });

    await expect(
      service.createListing(
        { landTitleId: 'title-1', title: 'Not My Parcel', askingPrice: 10000 },
        'attacker',
        UserRole.CITIZEN,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('calculates 2.5% commission and locks listing in escrow when purchase is initiated', async () => {
    listingRepo.findOne.mockResolvedValue({
      id: 'listing-1',
      landTitleId: 'title-1',
      parcelId: 'parcel-1',
      sellerUserId: 'seller-1',
      sellerAddress: '0x1111111111111111111111111111111111111111',
      askingPrice: '10000.000000',
      currency: 'POL',
      chainId: '80002',
      status: 'ACTIVE',
    });
    titleRepo.findOne.mockResolvedValue({ id: 'title-1', isRevoked: false, tokenId: '1' });

    const res = await service.initiatePurchase(
      'listing-1',
      {
        buyerAddress: '0x2222222222222222222222222222222222222222',
        escrowTxHash: '0x' + 'a'.repeat(64),
      },
      'buyer-1',
    );

    expect(res.commission.commissionRateBps).toBe(250);
    expect(res.commission.commissionAmount).toBe('250.000000');
    expect(res.listing.status).toBe('ESCROW_LOCKED');
    expect(res.transfer.status).toBe('ESCROWED');
  });

  it('settles approved transfer, deducts commission, and marks listing SOLD', async () => {
    transferRepo.findOne.mockResolvedValue({
      id: 'transfer-1',
      transferRef: 'AN-TRF-1',
      landTitleId: 'title-1',
      buyerAddress: '0x2222222222222222222222222222222222222222',
      status: 'REGISTRAR_APPROVED',
    });
    titleRepo.findOne.mockResolvedValue({ id: 'title-1', isRevoked: false, tokenId: '1' });
    paymentRepo.findOne.mockResolvedValue({
      id: 'pay-1',
      grossAmount: '10000.000000',
      currency: 'POL',
      escrowStatus: 'ESCROWED',
    });
    commissionRepo.findOne.mockResolvedValue({
      id: 'comm-1',
      commissionAmount: '250.000000',
      status: 'ACCRUED',
    });

    const settled = await service.settleTransfer(
      'transfer-1',
      { settlementTxHash: '0x' + 'b'.repeat(64) },
      'registrar-1',
    );

    expect(settled.settlement.netSellerAmount).toBe('9750.000000');
    expect(settled.settlement.status).toBe('COMPLETED');
    expect(settled.commission?.status).toBe('COLLECTED');
    expect(listingRepo.update).toHaveBeenCalledWith(
      { landTitleId: 'title-1', status: 'ESCROW_LOCKED' },
      { status: 'SOLD' },
    );
  });
});
