import {
  Injectable, Logger, NotFoundException, BadRequestException, ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { LandTitle } from './entities/land-title.entity';
import { AuditService } from '../audit/audit.service';
import { MqttService } from '../mqtt/mqtt.service';

// ABI fragments — only what the backend needs to call
const LAND_REGISTRY_ABI = [
  'function registerTitle(address owner, string parcelId, bytes32 spatialHash, string tokenURI) external returns (uint256)',
  'function transferTitle(uint256 tokenId, address from, address to) external',
  'event RegistrationRecorded(uint256 indexed tokenId, string parcelId, address indexed owner, uint256 timestamp)',
];

const LAND_TITLE_NFT_ABI = [
  'function revoke(uint256 tokenId, uint8 ground) external',
  'function isRevoked(uint256 tokenId) external view returns (bool)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function tokenURI(uint256 tokenId) external view returns (string)',
  'function totalSupply() external view returns (uint256)',
  'event TitleRevoked(uint256 indexed tokenId, uint8 ground, address indexed revokedBy, uint256 timestamp)',
];

/**
 * Component 2 — Blockchain NFT Tokenisation and Statutory Revocation
 *
 * Parts A, B, C from PROJECT.md:
 *  A: Smart contract execution (issuing/updating records)
 *  B: NFT title issuance
 *  C: Statutory revocation (Governor-role only, LUA 1978 s.28)
 */
@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private provider!: ethers.JsonRpcProvider;
  private registrarWallet?: ethers.Wallet;
  private landRegistry?: ethers.Contract;
  private landTitleNFT?: ethers.Contract;

  constructor(
    @InjectRepository(LandTitle)
    private readonly titleRepo: Repository<LandTitle>,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
    private readonly mqttService: MqttService,
  ) {
    this.initialiseContracts();
  }

  private initialiseContracts() {
    const rpcUrl = this.config.get<string>('SEPOLIA_RPC_URL')
      ?? this.config.get<string>('BESU_RPC_URL', 'http://localhost:8545');
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    const registrarKey = this.config.get<string>('REGISTRAR_PRIVATE_KEY')
      ?? this.config.get<string>('DEPLOYER_PRIVATE_KEY');
    const registryAddress = this.config.get<string>('LAND_REGISTRY_ADDRESS');
    const nftAddress = this.config.get<string>('LAND_TITLE_NFT_ADDRESS');

    if (nftAddress && ethers.isAddress(nftAddress)) {
      this.landTitleNFT = new ethers.Contract(nftAddress, LAND_TITLE_NFT_ABI, this.provider);
    }
    if (registrarKey && registryAddress && ethers.isAddress(registryAddress)) {
      this.registrarWallet = new ethers.Wallet(registrarKey, this.provider);
      this.landRegistry = new ethers.Contract(registryAddress, LAND_REGISTRY_ABI, this.registrarWallet);
    }
    this.logger.log(
      this.landTitleNFT
        ? `Blockchain read service initialised. NFT=${nftAddress}`
        : 'Blockchain reads are unavailable until LAND_TITLE_NFT_ADDRESS is configured.',
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
        'Registry writes are not configured. Set the deployed registry address and a trusted registrar signer.',
      );
    }
    return {
      registry: this.landRegistry,
      registrar: this.registrarWallet,
    };
  }

  // ── Part A + B: Register title and issue NFT ──────────────────────────
  /**
   * Executes registerTitle() on LandRegistry.sol.
   * Records the result on-chain and updates the off-chain DB.
   */
  async issueTitle(params: {
    ownerAddress:   string;
    parcelId:       string;
    spatialHash:    string;   // hex string, e.g. "0xabc..."
    tokenUri:       string;
    applicationId:  string;
    ownerUserId?:   string;
  }): Promise<{ tokenId: string; txHash: string; blockNumber: string }> {
    const { registry, registrar } = this.requireRegistry();
    this.logger.log(`Issuing title for parcel ${params.parcelId}`);

    // Part A — validate against business rules
    const existing = await this.titleRepo.findOne({
      where: { parcelId: params.parcelId, isRevoked: false },
    });
    if (existing) {
      throw new BadRequestException(`Parcel ${params.parcelId} already has an active title`);
    }

    // Part B — execute smart contract
    const spatialHashBytes = params.spatialHash.startsWith('0x')
      ? params.spatialHash
      : '0x' + params.spatialHash;

    const tx = await registry.registerTitle(
      params.ownerAddress,
      params.parcelId,
      spatialHashBytes,
      params.tokenUri,
    );
    const receipt = await tx.wait();

    // Parse tokenId from RegistrationRecorded event
    const event = receipt.logs
      .map((log: any) => {
        try { return registry.interface.parseLog(log); } catch { return null; }
      })
      .find((e: any) => e?.name === 'RegistrationRecorded');

    const tokenId = event?.args?.tokenId?.toString() ?? '0';

    // Part A — update off-chain database
    const title = this.titleRepo.create({
      tokenId,
      parcelId:      params.parcelId,
      applicationId: params.applicationId,
      ownerAddress:  params.ownerAddress,
      ownerUserId:   params.ownerUserId ?? null,
      txHash:        receipt.hash,
      blockNumber:   receipt.blockNumber?.toString() ?? null,
      tokenUri:      params.tokenUri,
    });
    await this.titleRepo.save(title);

    // Part B — audit trail
    await this.auditService.log({
      entityType:  'title',
      entityId:    title.id,
      eventType:   'NFT_ISSUED',
      fromStatus:  null,
      toStatus:    'NFT_ISSUED',
      actorRole:   'REGISTRAR',
      actorId:     registrar.address,
      actorAddress: registrar.address,
      metadata:    { tokenId, txHash: receipt.hash },
    });

    // MQTT notification
    await this.mqttService.publishTitleIssued(
      params.applicationId, tokenId,
      params.parcelId, params.ownerAddress, receipt.hash,
    );

    this.logger.log(`Title issued: tokenId=${tokenId}, tx=${receipt.hash}`);
    return { tokenId, txHash: receipt.hash, blockNumber: receipt.blockNumber?.toString() };
  }

  // ── Part C: Statutory revocation (LUA 1978 s.28) ─────────────────────
  /**
   * Invokes revoke() on LandTitleNFT.sol.
   * Only the GOVERNOR_ROLE wallet may call this.
   *
   * Grounds:
   *   0 = OverridingPublicInterest
   *   1 = BreachOfStatutoryCondition
   */
  async revokeTitle(params: {
    tokenId:          string;
    ground:           0 | 1;
    requestedBy:      string;  // off-chain user ID for audit
  }): Promise<{ txHash: string; blockNumber: string; gasUsed: string; confirmationMs: number }> {
    const nft = this.requireNft();
    this.logger.log(`Revoking title tokenId=${params.tokenId}, ground=${params.ground}`);

    const title = await this.titleRepo.findOne({
      where: { tokenId: params.tokenId },
    });
    if (!title) throw new NotFoundException(`Title tokenId=${params.tokenId} not found`);
    if (title.isRevoked) throw new BadRequestException('Title already revoked');

    const governorKey = this.config.get<string>('GOVERNOR_PRIVATE_KEY');
    if (!governorKey) {
      throw new ServiceUnavailableException(
        'Statutory revocation is not configured. Set the Governor signer only in the trusted backend environment.',
      );
    }
    const governorWallet = new ethers.Wallet(governorKey, this.provider);
    const nftAsGovernor = nft.connect(governorWallet);

    const start = Date.now();
    const tx = await (nftAsGovernor as any).revoke(BigInt(params.tokenId), params.ground);
    const receipt = await tx.wait();
    const confirmationMs = Date.now() - start;

    // Update off-chain DB
    await this.titleRepo.update(title.id, {
      isRevoked:       true,
      revocationTx:    receipt.hash,
      revocationGround: params.ground === 0
        ? 'OVERRIDING_PUBLIC_INTEREST'
        : 'BREACH_OF_STATUTORY_CONDITION',
      revokedByAddress: governorWallet.address,
      revokedAt:        new Date(),
    });

    // Audit (immutable — revocation is a distinct event, not an overwrite)
    await this.auditService.log({
      entityType:   'title',
      entityId:     title.id,
      eventType:    'TITLE_REVOKED',
      fromStatus:   'NFT_ISSUED',
      toStatus:     'REVOKED',
      actorRole:    'GOVERNOR',
      actorId:      params.requestedBy,
      actorAddress: governorWallet.address,
      metadata:     {
        tokenId: params.tokenId,
        ground:  params.ground,
        txHash:  receipt.hash,
        gasUsed: receipt.gasUsed?.toString(),
        confirmationMs,
      },
    });

    // MQTT notification
    await this.mqttService.publishTitleRevoked(
      params.tokenId, params.ground,
      governorWallet.address, title.parcelId,
    );

    this.logger.log(
      `Title revoked: tokenId=${params.tokenId}, tx=${receipt.hash}, ` +
      `gas=${receipt.gasUsed}, time=${confirmationMs}ms`
    );

    return {
      txHash:        receipt.hash,
      blockNumber:   receipt.blockNumber?.toString(),
      gasUsed:       receipt.gasUsed?.toString(),
      confirmationMs,
    };
  }

  // ── Queries ───────────────────────────────────────────────────────────
  async getTitleByTokenId(tokenId: string): Promise<LandTitle | null> {
    return this.titleRepo.findOne({ where: { tokenId } });
  }

  async verifyPublicTitle(tokenId: string) {
    if (!/^[1-9]\d*$/.test(tokenId)) {
      throw new BadRequestException('Token ID must be a positive integer.');
    }
    const title = await this.getTitleByTokenId(tokenId);
    if (!title) throw new NotFoundException(`Title tokenId=${tokenId} not found`);

    const nft = this.requireNft();
    const [chainOwner, isRevoked, tokenUri] = await Promise.all([
      nft.ownerOf(BigInt(tokenId)),
      nft.isRevoked(BigInt(tokenId)),
      nft.tokenURI(BigInt(tokenId)),
    ]);

    return {
      tokenId: title.tokenId,
      parcelId: title.parcelId,
      ownerAddress: chainOwner as string,
      isRevoked: Boolean(isRevoked),
      tokenUri: tokenUri as string,
      issueTransaction: title.txHash,
      issueBlock: title.blockNumber,
      revocationTransaction: title.revocationTx,
      chainId: (await this.provider.getNetwork()).chainId.toString(),
    };
  }

  async listPublicTitles() {
    const records = await this.titleRepo.manager.query(
      `SELECT t.token_id AS "tokenId",
              t.parcel_id AS "parcelId",
              p.state,
              p.lga,
              p.address_desc AS "addressDesc",
              ST_Y(ST_Centroid(p.geom)) AS latitude,
              ST_X(ST_Centroid(p.geom)) AS longitude,
              t.is_revoked AS "isRevoked",
              t.issued_at AS "issuedAt"
       FROM land_titles t
       JOIN parcels p ON p.id = t.parcel_id
       WHERE p.geom IS NOT NULL
       ORDER BY t.issued_at DESC`,
    );
    return records.map((record: {
      tokenId: string;
      parcelId: string;
      state: string | null;
      lga: string | null;
      addressDesc: string | null;
      latitude: string | number;
      longitude: string | number;
      isRevoked: boolean;
      issuedAt: Date;
    }) => ({
      ...record,
      latitude: Number(record.latitude),
      longitude: Number(record.longitude),
    }));
  }

  async getTitleByParcelId(parcelId: string): Promise<LandTitle | null> {
    return this.titleRepo.findOne({ where: { parcelId } });
  }

  async isRevoked(tokenId: string): Promise<boolean> {
    const nft = this.requireNft();
    return nft.isRevoked(BigInt(tokenId));
  }
}
