import { ConfigService } from '@nestjs/config';
import { BlockchainService } from './blockchain.service';

describe('BlockchainService (Polygon Amoy & Privacy Public Verification)', () => {
  let service: BlockchainService;
  let titleRepo: any;
  let txRepo: any;
  let ownershipRepo: any;
  let dataSource: any;

  beforeEach(() => {
    titleRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn(), update: jest.fn() };
    txRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    ownershipRepo = { create: jest.fn(), save: jest.fn(), update: jest.fn() };
    dataSource = {
      query: jest.fn().mockResolvedValue([
        {
          parcelNumber: 'AN-PCL-001',
          status: 'ACTIVE',
          areaSqm: 650,
          state: 'Anambra',
          lga: 'Awka South',
          addressDesc: 'Plot 14 Independence Layout',
          latitude: 6.21,
          longitude: 7.07,
        },
      ]),
    };

    const config = {
      get: jest.fn((key: string, def?: string) => {
        if (key === 'CHAIN_ID') return '80002';
        if (key === 'POLYGON_AMOY_RPC_URL') return 'https://rpc-amoy.polygon.technology';
        return def;
      }),
    } as unknown as ConfigService;

    service = new BlockchainService(
      titleRepo,
      txRepo,
      ownershipRepo,
      config,
      { log: jest.fn() } as any,
      { publishTitleIssued: jest.fn(), publishTitleRevoked: jest.fn(), publish: jest.fn() } as any,
      dataSource,
    );
  });

  it('returns privacy-safe Polygon Amoy verification payload without NIN, email, phone, or docs', async () => {
    titleRepo.findOne.mockResolvedValue({
      id: 'title-1',
      tokenId: '42',
      titleNumber: 'AN-COFO-000042',
      parcelId: 'parcel-uuid-1',
      ownerAddress: '0x1111111111111111111111111111111111111111',
      txHash: '0x' + 'c'.repeat(64),
      blockNumber: '123456',
      chainId: '80002',
      isRevoked: false,
      revocationGround: null,
      revocationTx: null,
      tokenUri: 'ipfs://QmTest',
    });

    const result = await service.verifyPublicTitle('42');
    expect(result.chainId).toBe('80002');
    expect(result.networkName).toBe('polygon_amoy');
    expect(result.explorerUrl).toContain('https://amoy.polygonscan.com/tx/0x');
    expect((result as any).nationalId).toBeUndefined();
    expect((result as any).email).toBeUndefined();
    expect((result as any).phone).toBeUndefined();
    expect((result as any).ownerName).toBeUndefined();
    expect((result as any).documents).toBeUndefined();
  });

  it('verifies transaction hash and returns Polygon Amoy explorer URL', async () => {
    txRepo.findOne.mockResolvedValue({
      txHash: '0x' + 'd'.repeat(64),
      chainId: '80002',
      networkName: 'polygon_amoy',
      txType: 'ISSUE_TITLE',
      status: 'CONFIRMED',
      blockNumber: '98765',
      confirmedAt: new Date(),
    });
    (service as any).provider = {
      getTransactionReceipt: jest.fn().mockResolvedValue({ blockNumber: 98765, status: 1 }),
    };

    const tx = await service.verifyTxHash('0x' + 'd'.repeat(64));
    expect(tx.onChainVerified).toBe(true);
    expect(tx.explorerUrl).toBe(`https://amoy.polygonscan.com/tx/${'0x' + 'd'.repeat(64)}`);
  });
});
