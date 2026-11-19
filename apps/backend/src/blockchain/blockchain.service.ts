import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { LandTitle } from './entities/land-title.entity';
import {
  BlockchainTransaction,
  TitleOwnershipHistory,
} from './entities/blockchain-transaction.entity';
import { AuditService } from '../audit/audit.service';
import { MqttService } from '../mqtt/mqtt.service';
import { UserRole } from '../auth/entities/user.entity';

const POLYGON_AMOY_EXPLORER = 'https://amoy.polygonscan.com';

const LAND_REGISTRY_ABI = [
  'function registerTitle(address owner, string parcelId, bytes32 spatialHash, string tokenURI) external returns (uint256)',
  'function transferTitle(uint256 tokenId, address from, address to) external',
  'function transferTitleWithReference(uint256 tokenId, address from, address to, bytes32 deedRefHash) external',
  'function verifyTitleByTokenId(uint256 tokenId) view returns (tuple(bool exists, uint256 tokenId, string parcelId, address currentOwner, bytes32 spatialHash, uint256 issuedAt, uint8 status, bool isRevoked, uint8 revocationGround, uint256 revokedAt, bytes32 gazetteRefHash, bytes32 lastDeedRefHash, uint256 lastTransferredAt))',
  'function verifyTitleByParcelId(string parcelId) view returns (tuple(bool exists, uint256 tokenId, string parcelId, address currentOwner, bytes32 spatialHash, uint256 issuedAt, uint8 status, bool isRevoked, uint8 revocationGround, uint256 revokedAt, bytes32 gazetteRefHash, bytes32 lastDeedRefHash, uint256 lastTransferredAt))',
  'event RegistrationRecorded(uint256 indexed tokenId, string parcelId, address indexed owner, uint256 timestamp)',
  'event TransferRecorded(uint256 indexed tokenId, address indexed from, address indexed to, uint256 timestamp)',
  'event TransferReferenceRecorded(uint256 indexed tokenId, address indexed from, address indexed to, bytes32 deedRefHash, uint256 timestamp)',
];

const LAND_TITLE_NFT_ABI = [
  'function revoke(uint256 tokenId, uint8 ground) external',
  'function revokeWithReference(uint256 tokenId, uint8 ground, bytes32 gazetteRefHash) external',
  'function isRevoked(uint256 tokenId) external view returns (bool)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function tokenURI(uint256 tokenId) external view returns (string)',
  'function totalSupply() external view returns (uint256)',
  'event TitleRevoked(uint256 indexed tokenId, uint8 ground, address indexed revokedBy, uint256 timestamp)',
];

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private provider!: ethers.JsonRpcProvider;
  private registrarWallet?: ethers.Wallet;
  private landRegistry?: ethers.Contract;
  private landTitleNFT?: ethers.Contract;
  private registryAddress?: string;
  private nftAddress?: string;
  private chainId: string;

  constructor(
    @InjectRepository(LandTitle)
    private readonly titleRepo: Repository<LandTitle>,
    @InjectRepository(BlockchainTransaction)
    private readonly txRepo: Repository<BlockchainTransaction>,
    @InjectRepository(TitleOwnershipHistory)
    private readonly ownershipRepo: Repository<TitleOwnershipHistory>,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
    private readonly mqttService: MqttService,
    @Optional() private readonly dataSource?: DataSource,
  ) {
    this.chainId = String(this.config.get<string>('CHAIN_ID', '80002'));
    this.initialiseContracts();
  }

  private initialiseContracts() {
    const rpcUrl =
      this.config.get<string>('POLYGON_AMOY_RPC_URL') ??
      this.config.get<string>('SEPOLIA_RPC_URL') ??
      this.config.get<string>('BESU_RPC_URL') ??
      'https://rpc-amoy.polygon.technology';

    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    const registrarKey =
      this.config.get<string>('REGISTRAR_PRIVATE_KEY') ??
      this.config.get<string>('DEPLOYER_PRIVATE_KEY');
    const registryAddress = this.config.get<string>('LAND_REGISTRY_ADDRESS');
    const nftAddress = this.config.get<string>('LAND_TITLE_NFT_ADDRESS');

    if (nftAddress && ethers.isAddress(nftAddress)) {
      this.nftAddress = nftAddress;
      this.landTitleNFT = new ethers.Contract(nftAddress, LAND_TITLE_NFT_ABI, this.provider);
    }
    if (
      registrarKey &&
      !registrarKey.startsWith('CHANGE_ME') &&
      registryAddress &&
      ethers.isAddress(registryAddress)
    ) {
      this.registryAddress = registryAddress;
      this.registrarWallet = new ethers.Wallet(registrarKey, this.provider);
      this.landRegistry = new ethers.Contract(registryAddress, LAND_REGISTRY_ABI, this.registrarWallet);
    }
    this.logger.log(
      this.landTitleNFT
        ? `Polygon Amoy (${this.chainId}) read service initialized. NFT=${nftAddress}`
        : 'Blockchain reads unavailable until LAND_TITLE_NFT_ADDRESS is configured.',
    );
  }

  private requireNft() {
    if (!this.landTitleNFT) {
      throw new ServiceUnavailableException(
        'The NFT contract is not configured. Deploy it and set LAND_TITLE_NFT_ADDRESS.',
      );
    }
    return this.landTitleNFT;
  }

  private requireRegistry() {
    if (!this.landRegistry || !this.registrarWallet) {
      throw new ServiceUnavailableException(
        'Registry writes are not configured. Set LAND_REGISTRY_ADDRESS and REGISTRAR_PRIVATE_KEY.',
      );
    }
    return {
      registry: this.landRegistry,
      registrar: this.registrarWallet,
    };
  }

  async issueTitle(params: {
    ownerAddress: string;
    parcelId: string;
    spatialHash: string;
    tokenUri: string;
    applicationId: string;
    ownerUserId?: string;
    registrarUserId?: string;
  }): Promise<{ tokenId: string; titleNumber: string; txHash: string; blockNumber: string }> {
    const { registry, registrar } = this.requireRegistry();
    this.logger.log(`Issuing NFT title for parcel ${params.parcelId} on Polygon Amoy`);

    const existing = await this.titleRepo.findOne({
      where: { parcelId: params.parcelId, isRevoked: false },
    });
    if (existing) {
      throw new BadRequestException(`Parcel ${params.parcelId} already has an active title.`);
    }

    if (this.dataSource) {
      const appRows = await this.dataSource.query<
        Array<{ id: string; status: string; applicant_id: string }>
      >(
        `SELECT id, status, applicant_id FROM applications WHERE id = $1::uuid`,
        [params.applicationId],
      );
      if (!appRows.length) {
        throw new NotFoundException(`Application ${params.applicationId} not found`);
      }
      if (appRows[0].status !== 'APPROVED') {
        throw new BadRequestException(
          `Application must be APPROVED by Registrar before NFT issuance (current: ${appRows[0].status}).`,
        );
      }
    }

    const spatialHashBytes = params.spatialHash.startsWith('0x')
      ? params.spatialHash
      : `0x${params.spatialHash}`;

    const tx = await registry.registerTitle(
      params.ownerAddress,
      params.parcelId,
      spatialHashBytes,
      params.tokenUri,
    );
    const receipt = await tx.wait();

    const event = receipt.logs
      .map((log: any) => {
        try {
          return registry.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e: any) => e?.name === 'RegistrationRecorded');

    const tokenId = event?.args?.tokenId?.toString() ?? '0';
    const titleNumber = `AN-COFO-${tokenId.padStart(6, '0')}`;

    const btx = await this.txRepo.save(
      this.txRepo.create({
        chainId: this.chainId,
        networkName: 'polygon_amoy',
        contractAddress: this.registryAddress ?? this.nftAddress ?? params.ownerAddress,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber?.toString() ?? null,
        blockHash: receipt.blockHash ?? null,
        txType: 'ISSUE_TITLE',
        status: 'CONFIRMED',
        fromAddress: registrar.address,
        toAddress: params.ownerAddress,
        gasUsed: receipt.gasUsed?.toString() ?? null,
        effectiveGasPriceWei: receipt.gasPrice?.toString() ?? null,
        relatedEntityType: 'application',
        relatedEntityId: params.applicationId,
        confirmedAt: new Date(),
      }),
    );

    const title = this.titleRepo.create({
      titleNumber,
      tokenId,
      chainId: this.chainId,
      contractAddress: this.nftAddress ?? null,
      parcelId: params.parcelId,
      applicationId: params.applicationId,
      ownerAddress: params.ownerAddress,
      ownerUserId: params.ownerUserId ?? null,
      txHash: receipt.hash,
      blockchainTxId: btx.id,
      blockNumber: receipt.blockNumber?.toString() ?? null,
      spatialHashHex: spatialHashBytes,
      tokenUri: params.tokenUri,
    });
    await this.titleRepo.save(title);

    await this.ownershipRepo.save(
      this.ownershipRepo.create({
        landTitleId: title.id,
        ownerUserId: params.ownerUserId ?? null,
        ownerAddress: params.ownerAddress,
        ownershipShareBps: 10000,
        acquisitionType: 'ORIGINAL_GRANT',
        txHash: receipt.hash,
        isCurrent: true,
      }),
    );

    if (this.dataSource) {
      await this.dataSource.query(
        `UPDATE applications SET status = 'NFT_ISSUED' WHERE id = $1::uuid`,
        [params.applicationId],
      );
      await this.dataSource.query(
        `UPDATE parcels SET status = 'ACTIVE' WHERE id = $1::uuid`,
        [params.parcelId],
      );
      await this.dataSource.query(
        `INSERT INTO application_status_history (
           application_id, from_status, to_status, stage, actor_id, actor_role, notes
         ) VALUES ($1::uuid, 'APPROVED', 'NFT_ISSUED', 'BLOCKCHAIN_MINT', $2::uuid, 'REGISTRAR', $3)`,
        [
          params.applicationId,
          params.registrarUserId ?? null,
          `NFT Title #${tokenId} issued on Polygon Amoy (${receipt.hash})`,
        ],
      );
    }

    await this.auditService.log({
      entityType: 'title',
      entityId: title.id,
      eventType: 'NFT_ISSUED',
      fromStatus: 'APPROVED',
      toStatus: 'NFT_ISSUED',
      actorRole: UserRole.REGISTRAR,
      actorId: params.registrarUserId ?? registrar.address,
      actorAddress: registrar.address,
      metadata: { tokenId, titleNumber, txHash: receipt.hash, chainId: this.chainId },
    });

    await this.safeMqtt(() =>
      this.mqttService.publishTitleIssued(
        params.applicationId,
        tokenId,
        params.parcelId,
        params.ownerAddress,
        receipt.hash,
      ),
    );

    return {
      tokenId,
      titleNumber,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber?.toString(),
    };
  }

  async transferTitle(params: {
    tokenId: string;
    toAddress: string;
    toUserId?: string;
    deedReference?: string;
    registrarUserId: string;
  }) {
    const { registry, registrar } = this.requireRegistry();
    const title = await this.titleRepo.findOne({ where: { tokenId: params.tokenId } });
    if (!title) throw new NotFoundException(`Title tokenId=${params.tokenId} not found`);
    if (title.isRevoked) throw new BadRequestException('Cannot transfer a revoked land title.');
    if (title.ownerAddress.toLowerCase() === params.toAddress.toLowerCase()) {
      throw new BadRequestException('Recipient address matches current title holder.');
    }

    const fromAddress = title.ownerAddress;
    const deedRefHash = ethers.keccak256(
      ethers.toUtf8Bytes(params.deedReference ?? `${title.id}:${Date.now()}`),
    );

    const tx = registry.transferTitleWithReference
      ? await registry.transferTitleWithReference(
          BigInt(params.tokenId),
          fromAddress,
          params.toAddress,
          deedRefHash,
        )
      : await registry.transferTitle(BigInt(params.tokenId), fromAddress, params.toAddress);

    const receipt = await tx.wait();

    const btx = await this.txRepo.save(
      this.txRepo.create({
        chainId: this.chainId,
        networkName: 'polygon_amoy',
        contractAddress: this.registryAddress ?? this.nftAddress ?? fromAddress,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber?.toString() ?? null,
        blockHash: receipt.blockHash ?? null,
        txType: 'TRANSFER_TITLE',
        status: 'CONFIRMED',
        fromAddress,
        toAddress: params.toAddress,
        gasUsed: receipt.gasUsed?.toString() ?? null,
        relatedEntityType: 'title',
        relatedEntityId: title.id,
        confirmedAt: new Date(),
      }),
    );

    await this.ownershipRepo.update(
      { landTitleId: title.id, isCurrent: true },
      { isCurrent: false, relinquishedAt: new Date() },
    );

    await this.ownershipRepo.save(
      this.ownershipRepo.create({
        landTitleId: title.id,
        ownerUserId: params.toUserId ?? null,
        ownerAddress: params.toAddress,
        ownershipShareBps: 10000,
        acquisitionType: 'TRANSFER',
        txHash: receipt.hash,
        isCurrent: true,
      }),
    );

    await this.titleRepo.update(title.id, {
      ownerAddress: params.toAddress,
      ownerUserId: params.toUserId ?? null,
    });

    await this.auditService.log({
      entityType: 'title',
      entityId: title.id,
      eventType: 'TITLE_TRANSFERRED',
      fromStatus: fromAddress,
      toStatus: params.toAddress,
      actorRole: UserRole.REGISTRAR,
      actorId: params.registrarUserId,
      actorAddress: registrar.address,
      metadata: {
        tokenId: params.tokenId,
        txHash: receipt.hash,
        blockchainTxId: btx.id,
        deedReference: params.deedReference ?? null,
      },
    });

    await this.safeMqtt(() =>
      this.mqttService.publish('land/transfer/completed', {
        tokenId: params.tokenId,
        fromAddress,
        toAddress: params.toAddress,
        txHash: receipt.hash,
      }, 2),
    );

    return {
      tokenId: params.tokenId,
      fromAddress,
      toAddress: params.toAddress,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber?.toString(),
    };
  }

  async revokeTitle(params: {
    tokenId: string;
    ground: 0 | 1;
    gazetteRef?: string;
    requestedBy: string;
  }): Promise<{ txHash: string; blockNumber: string; gasUsed: string; confirmationMs: number }> {
    const nft = this.requireNft();
    this.logger.log(`Revoking title tokenId=${params.tokenId}, ground=${params.ground}`);

    const title = await this.titleRepo.findOne({ where: { tokenId: params.tokenId } });
    if (!title) throw new NotFoundException(`Title tokenId=${params.tokenId} not found`);
    if (title.isRevoked) throw new BadRequestException('Title already revoked');

    const governorKey = this.config.get<string>('GOVERNOR_PRIVATE_KEY');
    if (!governorKey || governorKey.startsWith('CHANGE_ME')) {
      throw new ServiceUnavailableException(
        'Statutory revocation is not configured. Set GOVERNOR_PRIVATE_KEY on the backend.',
      );
    }
    const governorWallet = new ethers.Wallet(governorKey, this.provider);
    const nftAsGovernor = nft.connect(governorWallet) as any;

    const start = Date.now();
    const tx = params.gazetteRef && nftAsGovernor.revokeWithReference
      ? await nftAsGovernor.revokeWithReference(
          BigInt(params.tokenId),
          params.ground,
          ethers.keccak256(ethers.toUtf8Bytes(params.gazetteRef)),
        )
      : await nftAsGovernor.revoke(BigInt(params.tokenId), params.ground);
    const receipt = await tx.wait();
    const confirmationMs = Date.now() - start;

    const btx = await this.txRepo.save(
      this.txRepo.create({
        chainId: this.chainId,
        networkName: 'polygon_amoy',
        contractAddress: this.nftAddress ?? governorWallet.address,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber?.toString() ?? null,
        blockHash: receipt.blockHash ?? null,
        txType: 'REVOKE_TITLE',
        status: 'CONFIRMED',
        fromAddress: governorWallet.address,
        toAddress: this.nftAddress ?? null,
        gasUsed: receipt.gasUsed?.toString() ?? null,
        relatedEntityType: 'title',
        relatedEntityId: title.id,
        confirmedAt: new Date(),
      }),
    );

    const groundEnum =
      params.ground === 0 ? 'OVERRIDING_PUBLIC_INTEREST' : 'BREACH_OF_STATUTORY_CONDITION';

    await this.titleRepo.update(title.id, {
      isRevoked: true,
      revocationTx: receipt.hash,
      revocationTxId: btx.id,
      revocationGround: groundEnum,
      revokedByAddress: governorWallet.address,
      revokedAt: new Date(),
    });

    if (this.dataSource) {
      await this.dataSource.query(
        `UPDATE parcels SET status = 'REVOKED' WHERE id = $1::uuid`,
        [title.parcelId],
      );
    }

    await this.auditService.log({
      entityType: 'title',
      entityId: title.id,
      eventType: 'TITLE_REVOKED',
      fromStatus: 'NFT_ISSUED',
      toStatus: 'REVOKED',
      actorRole: UserRole.GOVERNOR,
      actorId: params.requestedBy,
      actorAddress: governorWallet.address,
      metadata: {
        tokenId: params.tokenId,
        ground: params.ground,
        txHash: receipt.hash,
        gasUsed: receipt.gasUsed?.toString(),
        confirmationMs,
      },
    });

    await this.safeMqtt(() =>
      this.mqttService.publishTitleRevoked(
        params.tokenId,
        params.ground,
        governorWallet.address,
        title.parcelId,
      ),
    );

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber?.toString(),
      gasUsed: receipt.gasUsed?.toString(),
      confirmationMs,
    };
  }

  async listTitles(userId: string, role: string) {
    const oversightRoles = [UserRole.REGISTRAR, UserRole.LAND_ADMINISTRATOR, UserRole.GOVERNOR];
    if (oversightRoles.includes(role as UserRole)) {
      return this.titleRepo.find({ order: { issuedAt: 'DESC' }, take: 200 });
    }
    return this.titleRepo.find({
      where: { ownerUserId: userId },
      order: { issuedAt: 'DESC' },
    });
  }

  async getTitleByTokenId(tokenId: string, userId?: string, role?: string): Promise<LandTitle | null> {
    const title = await this.titleRepo.findOne({ where: { tokenId } });
    if (!title) throw new NotFoundException(`Title tokenId=${tokenId} not found`);
    if (
      userId &&
      role &&
      ![UserRole.REGISTRAR, UserRole.LAND_ADMINISTRATOR, UserRole.GOVERNOR, UserRole.SURVEYOR].includes(
        role as UserRole,
      ) &&
      title.ownerUserId !== userId
    ) {
      throw new ForbiddenException('You do not have access to private title details.');
    }
    return title;
  }

  async getTitleTransactions(tokenId: string) {
    const title = await this.titleRepo.findOne({ where: { tokenId } });
    if (!title) throw new NotFoundException(`Title tokenId=${tokenId} not found`);

    const [transactions, ownershipHistory] = await Promise.all([
      this.txRepo.find({
        where: { relatedEntityId: title.id },
        order: { submittedAt: 'DESC' },
      }),
      this.ownershipRepo.find({
        where: { landTitleId: title.id },
        order: { acquiredAt: 'DESC' },
      }),
    ]);

    return { titleId: title.id, tokenId, transactions, ownershipHistory };
  }

  async verifyTxHash(txHash: string) {
    const txRecord = await this.txRepo.findOne({ where: { txHash } });
    if (!txRecord) throw new NotFoundException(`Transaction ${txHash} not found in registry`);

    let onChainReceipt: { blockNumber: number; status: number | null } | null = null;
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      if (receipt) {
        onChainReceipt = { blockNumber: receipt.blockNumber, status: receipt.status };
      }
    } catch {
      // Non-fatal if RPC endpoint temporarily unreachable
    }

    return {
      txHash: txRecord.txHash,
      chainId: txRecord.chainId,
      networkName: txRecord.networkName,
      txType: txRecord.txType,
      status: txRecord.status,
      blockNumber: txRecord.blockNumber,
      confirmedAt: txRecord.confirmedAt,
      explorerUrl: `${POLYGON_AMOY_EXPLORER}/tx/${txRecord.txHash}`,
      onChainVerified: Boolean(onChainReceipt && onChainReceipt.status === 1),
    };
  }

  /**
   * Public verification endpoint — NEVER returns NIN, email, phone, owner full name, or private docs.
   */
  async verifyPublicTitle(tokenId: string) {
    if (!/^[1-9]\d*$/.test(tokenId)) {
      throw new BadRequestException('Token ID must be a positive integer.');
    }
    const title = await this.titleRepo.findOne({ where: { tokenId } });
    if (!title) throw new NotFoundException(`Title tokenId=${tokenId} not found`);

    let chainOwner = title.ownerAddress;
    let isRevoked = title.isRevoked;
    let tokenUri = title.tokenUri ?? '';
    let chainId = title.chainId ?? this.chainId;
    let onChainVerified = false;

    if (this.landTitleNFT) {
      try {
        const [ownerResult, revokedResult, uriResult, network] = await Promise.all([
          this.landTitleNFT.ownerOf(BigInt(tokenId)),
          this.landTitleNFT.isRevoked(BigInt(tokenId)),
          this.landTitleNFT.tokenURI(BigInt(tokenId)),
          this.provider.getNetwork(),
        ]);
        chainOwner = ownerResult as string;
        isRevoked = Boolean(revokedResult);
        tokenUri = uriResult as string;
        chainId = network.chainId.toString();
        onChainVerified = true;
      } catch (err) {
        this.logger.warn(
          `On-chain verification fallback to PostgreSQL snapshot for token ${tokenId}: ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    }

    let parcelSummary: Record<string, unknown> | null = null;
    if (this.dataSource) {
      const rows = await this.dataSource.query(
        `SELECT parcel_number AS "parcelNumber",
                status,
                area_sqm AS "areaSqm",
                state,
                lga,
                address_desc AS "addressDesc",
                ST_Y(centroid) AS latitude,
                ST_X(centroid) AS longitude
         FROM parcels
         WHERE id = $1::uuid`,
        [title.parcelId],
      );
      parcelSummary = rows[0] ?? null;
    }

    return {
      tokenId: title.tokenId,
      titleNumber: title.titleNumber,
      parcelId: title.parcelId,
      parcel: parcelSummary,
      ownerAddress: chainOwner,
      isRevoked,
      revocationGround: title.revocationGround,
      tokenUri,
      issueTransaction: title.txHash,
      issueBlock: title.blockNumber,
      revocationTransaction: title.revocationTx,
      chainId,
      networkName: 'polygon_amoy',
      explorerUrl: `${POLYGON_AMOY_EXPLORER}/tx/${title.txHash}`,
      onChainVerified,
    };
  }

  async listPublicTitles() {
    const records = await this.titleRepo.manager.query(
      `SELECT t.token_id AS "tokenId",
              t.title_number AS "titleNumber",
              t.parcel_id AS "parcelId",
              p.parcel_number AS "parcelNumber",
              p.state,
              p.lga,
              p.area_sqm AS "areaSqm",
              p.address_desc AS "addressDesc",
              ST_Y(ST_Centroid(p.geom)) AS latitude,
              ST_X(ST_Centroid(p.geom)) AS longitude,
              t.is_revoked AS "isRevoked",
              t.chain_id AS "chainId",
              t.tx_hash AS "txHash",
              t.issued_at AS "issuedAt"
       FROM land_titles t
       JOIN parcels p ON p.id = t.parcel_id
       WHERE p.geom IS NOT NULL
       ORDER BY t.issued_at DESC`,
    );
    return records.map((record: Record<string, unknown>) => ({
      ...record,
      areaSqm: record.areaSqm !== null && record.areaSqm !== undefined ? Number(record.areaSqm) : null,
      latitude: Number(record.latitude),
      longitude: Number(record.longitude),
      explorerUrl: `${POLYGON_AMOY_EXPLORER}/tx/${record.txHash}`,
    }));
  }

  async getTitleByParcelId(parcelId: string): Promise<LandTitle | null> {
    return this.titleRepo.findOne({ where: { parcelId } });
  }

  async isRevoked(tokenId: string): Promise<boolean> {
    const nft = this.requireNft();
    return nft.isRevoked(BigInt(tokenId));
  }

  private async safeMqtt(fn: () => Promise<void>) {
    try {
      await fn();
    } catch (err) {
      this.logger.warn(`Non-fatal MQTT publish failure: ${err instanceof Error ? err.message : err}`);
    }
  }
}
