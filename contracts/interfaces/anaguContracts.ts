/**
 * ANAGU Smart Contract Integration Interfaces & ABIs
 * Target Network: Polygon Amoy Testnet (chainId 80002)
 *
 * Prepared for Phase 3 Backend & Frontend Web3 Integration.
 * Never store NINs, owner names, or private documents on-chain.
 */

export const POLYGON_AMOY_NETWORK = {
  chainId: 80002,
  chainIdHex: '0x13882',
  name: 'Polygon Amoy Testnet',
  rpcUrl: 'https://rpc-amoy.polygon.technology',
  explorerUrl: 'https://amoy.polygonscan.com',
  nativeCurrency: {
    name: 'POL',
    symbol: 'POL',
    decimals: 18,
  },
} as const;

export enum TitleStatus {
  Active = 0,
  Revoked = 1,
}

export enum RevocationGround {
  OverridingPublicInterest = 0,
  BreachOfStatutoryCondition = 1,
}

export const LAND_TITLE_NFT_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function isRevoked(uint256 tokenId) view returns (bool)',
  'function titleStatus(uint256 tokenId) view returns (uint8)',
  'function spatialHash(uint256 tokenId) view returns (bytes32)',
  'function parcelId(uint256 tokenId) view returns (string)',
  'function revocationGround(uint256 tokenId) view returns (uint8)',
  'function revokedAt(uint256 tokenId) view returns (uint256)',
  'function gazetteRefHash(uint256 tokenId) view returns (bytes32)',
  'function getTokenIdByParcelId(string _parcelId) view returns (uint256)',
  'function getTitleMetadata(uint256 tokenId) view returns (tuple(uint256 tokenId, address owner, string parcelId, bytes32 spatialHash, uint256 issuedAt, uint8 status, bool revoked, uint8 revocationGround, uint256 revokedAt, bytes32 gazetteRefHash))',
  'function REGISTRAR_ROLE() view returns (bytes32)',
  'function GOVERNOR_ROLE() view returns (bytes32)',
  'function PAUSER_ROLE() view returns (bytes32)',
  'function issueTitle(address to, string _parcelId, bytes32 _spatialHash, string _tokenURI) returns (uint256)',
  'function registrarTransfer(address from, address to, uint256 tokenId)',
  'function registrarTransferWithRef(address from, address to, uint256 tokenId, bytes32 deedRefHash)',
  'function revoke(uint256 tokenId, uint8 ground)',
  'function revokeWithReference(uint256 tokenId, uint8 ground, bytes32 _gazetteRefHash)',
  'event TitleIssued(uint256 indexed tokenId, address indexed owner, string parcelId, bytes32 spatialHash, uint256 timestamp)',
  'event TitleTransferred(uint256 indexed tokenId, address indexed from, address indexed to, bytes32 deedRefHash, uint256 timestamp)',
  'event TitleRevoked(uint256 indexed tokenId, uint8 ground, address indexed revokedBy, uint256 timestamp)',
  'event TitleStatusChanged(uint256 indexed tokenId, uint8 previousStatus, uint8 newStatus, bytes32 refHash, address indexed actor, uint256 timestamp)',
] as const;

export const LAND_REGISTRY_ABI = [
  'function landTitleNFT() view returns (address)',
  'function REGISTRAR_ROLE() view returns (bytes32)',
  'function PAUSER_ROLE() view returns (bytes32)',
  'function isParcelRegistered(string _parcelId) view returns (bool)',
  'function getParcelIdByTokenId(uint256 tokenId) view returns (string)',
  'function getRecordByParcelId(string _parcelId) view returns (tuple(uint256 tokenId, string parcelId, address owner, uint256 issuedAt, bool exists))',
  'function verifyTitleByTokenId(uint256 tokenId) view returns (tuple(bool exists, uint256 tokenId, string parcelId, address currentOwner, bytes32 spatialHash, uint256 issuedAt, uint8 status, bool isRevoked, uint8 revocationGround, uint256 revokedAt, bytes32 gazetteRefHash, bytes32 lastDeedRefHash, uint256 lastTransferredAt))',
  'function verifyTitleByParcelId(string _parcelId) view returns (tuple(bool exists, uint256 tokenId, string parcelId, address currentOwner, bytes32 spatialHash, uint256 issuedAt, uint8 status, bool isRevoked, uint8 revocationGround, uint256 revokedAt, bytes32 gazetteRefHash, bytes32 lastDeedRefHash, uint256 lastTransferredAt))',
  'function registerTitle(address owner, string _parcelId, bytes32 _spatialHash, string _tokenURI) returns (uint256)',
  'function transferTitle(uint256 tokenId, address from, address to)',
  'function transferTitleWithReference(uint256 tokenId, address from, address to, bytes32 deedRefHash)',
  'event RegistrationRecorded(uint256 indexed tokenId, string parcelId, address indexed owner, uint256 timestamp)',
  'event TransferRecorded(uint256 indexed tokenId, address indexed from, address indexed to, uint256 timestamp)',
  'event TransferReferenceRecorded(uint256 indexed tokenId, address indexed from, address indexed to, bytes32 deedRefHash, uint256 timestamp)',
] as const;
