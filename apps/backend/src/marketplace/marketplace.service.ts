import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  LandTransfer,
  MarketplaceListing,
  PaymentTransaction,
  PlatformCommission,
  SettlementRecord,
} from './entities/marketplace.entity';
import { LandTitle } from '../blockchain/entities/land-title.entity';
import { BlockchainService } from '../blockchain/blockchain.service';
import { AuditService } from '../audit/audit.service';
import { MqttService } from '../mqtt/mqtt.service';
import { UserRole } from '../auth/entities/user.entity';
import {
  CreateListingDto,
  PurchaseListingDto,
  SettleTransferDto,
  UpdateListingStatusDto,
} from './dto/marketplace.dto';

const DEFAULT_COMMISSION_BPS = 250; // 2.5%

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(
    @InjectRepository(MarketplaceListing)
    private readonly listingRepo: Repository<MarketplaceListing>,
    @InjectRepository(LandTransfer)
    private readonly transferRepo: Repository<LandTransfer>,
    @InjectRepository(PaymentTransaction)
    private readonly paymentRepo: Repository<PaymentTransaction>,
    @InjectRepository(PlatformCommission)
    private readonly commissionRepo: Repository<PlatformCommission>,
    @InjectRepository(SettlementRecord)
    private readonly settlementRepo: Repository<SettlementRecord>,
    @InjectRepository(LandTitle)
    private readonly titleRepo: Repository<LandTitle>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly mqttService: MqttService,
    @Optional() private readonly blockchainService?: BlockchainService,
  ) {}

  async listPublicListings(filters?: { state?: string; lga?: string; status?: string }) {
    const conditions: string[] = [
      `ml.status IN ('ACTIVE', 'UNDER_OFFER', 'ESCROW_LOCKED')`,
      `lt.is_revoked = FALSE`,
      `p.status = 'ACTIVE'`,
    ];
    const params: unknown[] = [];

    if (filters?.state) {
      params.push(filters.state);
      conditions.push(`LOWER(p.state) = LOWER($${params.length})`);
    }
    if (filters?.lga) {
      params.push(filters.lga);
      conditions.push(`LOWER(p.lga) = LOWER($${params.length})`);
    }
    if (filters?.status) {
      params.push(filters.status);
      conditions.push(`ml.status = $${params.length}::listing_status`);
    }

    return this.dataSource.query(
      `SELECT ml.id,
              ml.listing_ref AS "listingRef",
              ml.title,
              ml.description,
              ml.asking_price AS "askingPrice",
              ml.currency,
              ml.chain_id AS "chainId",
              ml.status,
              ml.is_title_verified AS "isTitleVerified",
              ml.created_at AS "createdAt",
              lt.token_id AS "tokenId",
              lt.title_number AS "titleNumber",
              lt.tx_hash AS "titleTxHash",
              p.id AS "parcelId",
              p.parcel_number AS "parcelNumber",
              p.area_sqm AS "areaSqm",
              p.state,
              p.lga,
              p.address_desc AS "addressDesc",
              p.land_use AS "landUse",
              ST_Y(p.centroid) AS latitude,
              ST_X(p.centroid) AS longitude
       FROM marketplace_listings ml
       JOIN land_titles lt ON lt.id = ml.land_title_id
       JOIN parcels p ON p.id = ml.parcel_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY ml.created_at DESC
       LIMIT 100`,
      params,
    );
  }

  async getListingById(listingId: string) {
    const rows = await this.dataSource.query(
      `SELECT ml.id,
              ml.listing_ref AS "listingRef",
              ml.title,
              ml.description,
              ml.asking_price AS "askingPrice",
              ml.currency,
              ml.chain_id AS "chainId",
              ml.status,
              ml.is_title_verified AS "isTitleVerified",
              ml.seller_address AS "sellerAddress",
              ml.created_at AS "createdAt",
              lt.id AS "landTitleId",
              lt.token_id AS "tokenId",
              lt.title_number AS "titleNumber",
              lt.is_revoked AS "isRevoked",
              lt.tx_hash AS "titleTxHash",
              p.id AS "parcelId",
              p.parcel_number AS "parcelNumber",
              p.area_sqm AS "areaSqm",
              p.state,
              p.lga,
              p.address_desc AS "addressDesc",
              p.land_use AS "landUse"
       FROM marketplace_listings ml
       JOIN land_titles lt ON lt.id = ml.land_title_id
       JOIN parcels p ON p.id = ml.parcel_id
       WHERE ml.id = $1::uuid`,
      [listingId],
    );
    if (!rows.length) throw new NotFoundException(`Listing ${listingId} not found`);
    return rows[0];
  }

  async createListing(dto: CreateListingDto, sellerUserId: string, sellerRole: UserRole) {
    const title = await this.titleRepo.findOne({ where: { id: dto.landTitleId } });
    if (!title) throw new NotFoundException('Land title not found');
    if (title.isRevoked) {
      throw new BadRequestException('Revoked land titles cannot be listed on the marketplace.');
    }
    if (title.ownerUserId && title.ownerUserId !== sellerUserId && sellerRole !== UserRole.REGISTRAR) {
      throw new ForbiddenException('Only the verified title holder may list this property.');
    }

    const activeExisting = await this.listingRepo.findOne({
      where: { landTitleId: title.id, status: 'ACTIVE' },
    });
    if (activeExisting) {
      throw new BadRequestException('An active marketplace listing already exists for this title.');
    }

    const listingRef = `AN-LST-${Date.now().toString(36).toUpperCase()}`;
    const listing = this.listingRepo.create({
      listingRef,
      landTitleId: title.id,
      parcelId: title.parcelId,
      sellerUserId,
      sellerAddress: title.ownerAddress,
      title: dto.title.trim(),
      description: dto.description ?? null,
      askingPrice: dto.askingPrice.toFixed(6),
      currency: dto.currency ?? 'POL',
      chainId: title.chainId ?? '80002',
      status: 'ACTIVE',
      isTitleVerified: true,
    });
    const saved = await this.listingRepo.save(listing);

    await this.auditService.log({
      entityType: 'marketplace_listing',
      entityId: saved.id,
      eventType: 'LISTING_CREATED',
      toStatus: 'ACTIVE',
      actorRole: sellerRole,
      actorId: sellerUserId,
      metadata: { listingRef, landTitleId: title.id, askingPrice: saved.askingPrice },
    });

    await this.safeMqtt(() =>
      this.mqttService.publish('land/marketplace/listed', {
        listingId: saved.id,
        listingRef,
        tokenId: title.tokenId,
        askingPrice: saved.askingPrice,
      }, 1),
    );

    return saved;
  }

  async updateListingStatus(
    listingId: string,
    dto: UpdateListingStatusDto,
    actorId: string,
    actorRole: UserRole,
  ) {
    const listing = await this.listingRepo.findOne({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found');

    if (
      listing.sellerUserId !== actorId &&
      actorRole !== UserRole.LAND_ADMINISTRATOR &&
      actorRole !== UserRole.REGISTRAR
    ) {
      throw new ForbiddenException('You cannot modify this listing.');
    }
    if (listing.status === 'SOLD') {
      throw new BadRequestException('Completed listings cannot change status.');
    }

    const prev = listing.status;
    listing.status = dto.status;
    await this.listingRepo.save(listing);

    await this.auditService.log({
      entityType: 'marketplace_listing',
      entityId: listing.id,
      eventType: `LISTING_${dto.status}`,
      fromStatus: prev,
      toStatus: dto.status,
      actorRole,
      actorId,
    });

    return listing;
  }

  async initiatePurchase(listingId: string, dto: PurchaseListingDto, buyerUserId: string) {
    const listing = await this.listingRepo.findOne({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.status !== 'ACTIVE') {
      throw new BadRequestException(`Listing is not open for purchase (current status: ${listing.status}).`);
    }
    if (listing.sellerUserId === buyerUserId) {
      throw new BadRequestException('Seller cannot purchase their own listing.');
    }
    if (listing.sellerAddress.toLowerCase() === dto.buyerAddress.toLowerCase()) {
      throw new BadRequestException('Buyer wallet address must differ from seller wallet address.');
    }

    const title = await this.titleRepo.findOne({ where: { id: listing.landTitleId } });
    if (!title || title.isRevoked) {
      throw new BadRequestException('Underlying NFT land title is invalid or revoked.');
    }

    const transferRef = `AN-TRF-${Date.now().toString(36).toUpperCase()}`;
    const paymentRef = `AN-PAY-${Date.now().toString(36).toUpperCase()}`;

    const transfer = await this.transferRepo.save(
      this.transferRepo.create({
        transferRef,
        landTitleId: listing.landTitleId,
        parcelId: listing.parcelId,
        sellerUserId: listing.sellerUserId,
        sellerAddress: listing.sellerAddress,
        buyerUserId,
        buyerAddress: dto.buyerAddress,
        considerationAmount: listing.askingPrice,
        currency: listing.currency,
        escrowTxHash: dto.escrowTxHash ?? null,
        status: dto.escrowTxHash ? 'ESCROWED' : 'REQUESTED',
      }),
    );

    const payment = await this.paymentRepo.save(
      this.paymentRepo.create({
        paymentRef,
        listingId: listing.id,
        landTransferId: transfer.id,
        buyerUserId,
        sellerUserId: listing.sellerUserId,
        payerAddress: dto.buyerAddress,
        payeeAddress: listing.sellerAddress,
        escrowStatus: dto.escrowTxHash ? 'ESCROWED' : 'INITIATED',
        grossAmount: listing.askingPrice,
        currency: listing.currency,
        chainId: listing.chainId,
        escrowTxHash: dto.escrowTxHash ?? null,
        escrowedAt: dto.escrowTxHash ? new Date() : null,
      }),
    );

    const commissionBps = await this.getConfiguredCommissionBps();
    const grossNum = Number(listing.askingPrice);
    const commissionNum = (grossNum * commissionBps) / 10000;

    const commission = await this.commissionRepo.save(
      this.commissionRepo.create({
        paymentTransactionId: payment.id,
        commissionRateBps: commissionBps,
        commissionAmount: commissionNum.toFixed(6),
        currency: listing.currency,
        status: 'ACCRUED',
      }),
    );

    listing.status = 'ESCROW_LOCKED';
    await this.listingRepo.save(listing);

    await this.auditService.log({
      entityType: 'land_transfer',
      entityId: transfer.id,
      eventType: 'PURCHASE_INITIATED',
      toStatus: transfer.status,
      actorRole: UserRole.CITIZEN,
      actorId: buyerUserId,
      actorAddress: dto.buyerAddress,
      metadata: {
        listingId: listing.id,
        transferRef,
        paymentRef,
        grossAmount: listing.askingPrice,
        commissionAmount: commission.commissionAmount,
      },
    });

    await this.safeMqtt(() =>
      this.mqttService.publish('land/marketplace/escrow-locked', {
        listingId: listing.id,
        transferId: transfer.id,
        transferRef,
        buyerAddress: dto.buyerAddress,
      }, 1),
    );

    return { transfer, payment, commission, listing };
  }

  async listTransfers(userId: string, role: UserRole) {
    const oversightRoles = [UserRole.REGISTRAR, UserRole.LAND_ADMINISTRATOR, UserRole.GOVERNOR];
    if (oversightRoles.includes(role)) {
      return this.transferRepo.find({ order: { requestedAt: 'DESC' }, take: 200 });
    }
    return this.transferRepo.find({
      where: [{ buyerUserId: userId }, { sellerUserId: userId }],
      order: { requestedAt: 'DESC' },
    });
  }

  async approveTransfer(transferId: string, registrarId: string) {
    const transfer = await this.transferRepo.findOne({ where: { id: transferId } });
    if (!transfer) throw new NotFoundException('Land transfer not found');
    if (!['REQUESTED', 'ESCROWED', 'LEGAL_CLEARED'].includes(transfer.status)) {
      throw new BadRequestException(`Cannot approve transfer in status ${transfer.status}`);
    }

    const prev = transfer.status;
    transfer.status = 'REGISTRAR_APPROVED';
    transfer.registrarId = registrarId;
    transfer.approvedAt = new Date();
    await this.transferRepo.save(transfer);

    await this.auditService.log({
      entityType: 'land_transfer',
      entityId: transfer.id,
      eventType: 'TRANSFER_REGISTRAR_APPROVED',
      fromStatus: prev,
      toStatus: 'REGISTRAR_APPROVED',
      actorRole: UserRole.REGISTRAR,
      actorId: registrarId,
    });

    return transfer;
  }

  async settleTransfer(transferId: string, dto: SettleTransferDto, registrarId: string) {
    const transfer = await this.transferRepo.findOne({ where: { id: transferId } });
    if (!transfer) throw new NotFoundException('Land transfer not found');
    if (transfer.status !== 'REGISTRAR_APPROVED') {
      throw new BadRequestException('Transfer must be REGISTRAR_APPROVED before final settlement.');
    }

    const title = await this.titleRepo.findOne({ where: { id: transfer.landTitleId } });
    if (!title || title.isRevoked) {
      throw new BadRequestException('Land title not found or revoked.');
    }

    let settlementTxHash = dto.settlementTxHash ?? null;
    if (!settlementTxHash && this.blockchainService) {
      try {
        const res = await this.blockchainService.transferTitle({
          tokenId: title.tokenId,
          toAddress: transfer.buyerAddress,
          toUserId: transfer.buyerUserId ?? undefined,
          deedReference: dto.deedReference ?? transfer.transferRef,
          registrarUserId: registrarId,
        });
        settlementTxHash = res.txHash;
      } catch (err) {
        this.logger.warn(
          `On-chain transfer unavailable during settlement (${transfer.transferRef}): ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    }

    const payment = await this.paymentRepo.findOne({ where: { landTransferId: transfer.id } });
    if (!payment) throw new NotFoundException('Associated payment transaction not found');

    const commission = await this.commissionRepo.findOne({
      where: { paymentTransactionId: payment.id },
    });

    const gross = Number(payment.grossAmount);
    const commAmount = commission ? Number(commission.commissionAmount) : 0;
    const netSeller = Math.max(gross - commAmount, 0);

    const settlement = await this.settlementRepo.save(
      this.settlementRepo.create({
        settlementRef: `AN-SET-${Date.now().toString(36).toUpperCase()}`,
        paymentTransactionId: payment.id,
        landTransferId: transfer.id,
        netSellerAmount: netSeller.toFixed(6),
        commissionAmount: commAmount.toFixed(6),
        currency: payment.currency,
        settlementTxHash,
        status: 'COMPLETED',
        settledAt: new Date(),
      }),
    );

    payment.escrowStatus = 'SETTLED';
    await this.paymentRepo.save(payment);

    if (commission) {
      commission.status = 'COLLECTED';
      commission.collectedAt = new Date();
      await this.commissionRepo.save(commission);
    }

    transfer.status = 'COMPLETED';
    transfer.settlementTxHash = settlementTxHash;
    transfer.completedAt = new Date();
    await this.transferRepo.save(transfer);

    await this.listingRepo.update(
      { landTitleId: transfer.landTitleId, status: 'ESCROW_LOCKED' },
      { status: 'SOLD' },
    );

    await this.auditService.log({
      entityType: 'land_transfer',
      entityId: transfer.id,
      eventType: 'TRANSFER_SETTLED',
      fromStatus: 'REGISTRAR_APPROVED',
      toStatus: 'COMPLETED',
      actorRole: UserRole.REGISTRAR,
      actorId: registrarId,
      metadata: { settlementRef: settlement.settlementRef, settlementTxHash },
    });

    await this.safeMqtt(() =>
      this.mqttService.publish('land/transfer/settled', {
        transferId: transfer.id,
        transferRef: transfer.transferRef,
        settlementRef: settlement.settlementRef,
        tokenId: title.tokenId,
      }, 2),
    );

    return { transfer, settlement, payment, commission };
  }

  private async getConfiguredCommissionBps(): Promise<number> {
    try {
      const rows = await this.dataSource.query<Array<{ config_value: { bps?: number } }>>(
        `SELECT config_value FROM administrative_configs WHERE config_key = 'marketplace.commission_bps' LIMIT 1`,
      );
      const bps = Number(rows[0]?.config_value?.bps);
      if (Number.isFinite(bps) && bps >= 0 && bps <= 2500) return bps;
    } catch {
      // Fallback to default if config row absent
    }
    return DEFAULT_COMMISSION_BPS;
  }

  private async safeMqtt(fn: () => Promise<void>) {
    try {
      await fn();
    } catch (err) {
      this.logger.warn(`Non-fatal MQTT publish failure: ${err instanceof Error ? err.message : err}`);
    }
  }
}
