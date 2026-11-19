// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/ILandTitleNFT.sol";
import "./interfaces/ILandRegistry.sol";

/**
 * @title  LandRegistry
 * @notice Manages land title issuance, registry-controlled transfers, and canonical
 *         verification queries for ANAGU.
 *
 * @dev    Architectural boundaries:
 *         - LandTitleNFT handles ERC-721 mechanics, approval locks, and Governor-only revocation.
 *         - LandRegistry coordinates business-rule checks, parcel uniqueness, transfer deed
 *           references, emergency pause protection, and unified read verification.
 *         - Off-chain statutory workflows (survey, GIS, oracle, legal review, registrar
 *           approval) must complete before a REGISTRAR_ROLE signer calls this contract.
 *         - Never store NINs, owner names, emails, or confidential docs on-chain.
 */
contract LandRegistry is AccessControl, Pausable, ReentrancyGuard, ILandRegistry {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 public constant PAUSER_ROLE    = keccak256("PAUSER_ROLE");

    ILandTitleNFT public immutable landTitleNFT;

    // ── Registry records (non-PII on-chain index) ─────────────────────────
    mapping(string => RegistryRecord) private _recordsByParcelId;
    mapping(uint256 => string)        private _parcelByTokenId;
    mapping(uint256 => bytes32)       private _lastDeedRefHash;
    mapping(uint256 => uint256)       private _lastTransferredAt;

    // ── Constructor ───────────────────────────────────────────────────────
    constructor(address _landTitleNFT, address adminAddress) {
        require(_landTitleNFT != address(0), "LandRegistry: zero NFT address");
        require(adminAddress  != address(0), "LandRegistry: zero admin address");

        landTitleNFT = ILandTitleNFT(_landTitleNFT);

        _grantRole(DEFAULT_ADMIN_ROLE, adminAddress);
        _grantRole(REGISTRAR_ROLE,     adminAddress);
        _grantRole(PAUSER_ROLE,        adminAddress);
    }

    // ── Emergency circuit breaker ─────────────────────────────────────────
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // ── Title registration ────────────────────────────────────────────────
    function registerTitle(
        address         owner,
        string calldata _parcelId,
        bytes32         _spatialHash,
        string calldata _tokenURI
    )
        external
        override
        onlyRole(REGISTRAR_ROLE)
        whenNotPaused
        nonReentrant
        returns (uint256 tokenId)
    {
        require(owner != address(0),           "LandRegistry: zero owner address");
        require(bytes(_parcelId).length > 0,   "LandRegistry: empty parcel ID");
        require(_spatialHash != bytes32(0),    "LandRegistry: zero spatial hash");
        require(bytes(_tokenURI).length > 0,   "LandRegistry: empty token URI");
        require(
            !_recordsByParcelId[_parcelId].exists,
            "LandRegistry: parcel already registered"
        );

        tokenId = landTitleNFT.issueTitle(owner, _parcelId, _spatialHash, _tokenURI);

        _recordsByParcelId[_parcelId] = RegistryRecord({
            tokenId:  tokenId,
            parcelId: _parcelId,
            owner:    owner,
            issuedAt: block.timestamp,
            exists:   true
        });
        _parcelByTokenId[tokenId] = _parcelId;

        emit RegistrationRecorded(tokenId, _parcelId, owner, block.timestamp);
    }

    // ── Registry-controlled transfers ─────────────────────────────────────
    function transferTitle(
        uint256 tokenId,
        address from,
        address to
    )
        external
        override
        onlyRole(REGISTRAR_ROLE)
        whenNotPaused
        nonReentrant
    {
        _executeTransfer(tokenId, from, to, bytes32(0));
    }

    function transferTitleWithReference(
        uint256 tokenId,
        address from,
        address to,
        bytes32 deedRefHash
    )
        external
        override
        onlyRole(REGISTRAR_ROLE)
        whenNotPaused
        nonReentrant
    {
        require(deedRefHash != bytes32(0), "LandRegistry: zero deed reference hash");
        _executeTransfer(tokenId, from, to, deedRefHash);
    }

    function _executeTransfer(
        uint256 tokenId,
        address from,
        address to,
        bytes32 deedRefHash
    ) internal {
        require(from != address(0), "LandRegistry: zero source address");
        require(to != address(0),   "LandRegistry: zero destination address");
        require(from != to,         "LandRegistry: self-transfer not allowed");

        string memory _parcelId = _parcelByTokenId[tokenId];
        require(bytes(_parcelId).length > 0, "LandRegistry: unknown token");

        if (deedRefHash != bytes32(0)) {
            landTitleNFT.registrarTransferWithRef(from, to, tokenId, deedRefHash);
            _lastDeedRefHash[tokenId] = deedRefHash;
            emit TransferReferenceRecorded(tokenId, from, to, deedRefHash, block.timestamp);
        } else {
            landTitleNFT.registrarTransfer(from, to, tokenId);
        }

        _recordsByParcelId[_parcelId].owner = to;
        _lastTransferredAt[tokenId]         = block.timestamp;

        emit TransferRecorded(tokenId, from, to, block.timestamp);
    }

    // ── View functions ────────────────────────────────────────────────────
    function getRecordByParcelId(string calldata _parcelId)
        external
        view
        override
        returns (RegistryRecord memory)
    {
        return _recordsByParcelId[_parcelId];
    }

    function getParcelIdByTokenId(uint256 tokenId)
        external
        view
        override
        returns (string memory)
    {
        return _parcelByTokenId[tokenId];
    }

    function isParcelRegistered(string calldata _parcelId)
        external
        view
        override
        returns (bool)
    {
        return _recordsByParcelId[_parcelId].exists;
    }

    function verifyTitleByTokenId(uint256 tokenId)
        external
        view
        override
        returns (TitleVerificationView memory)
    {
        string memory _parcelId = _parcelByTokenId[tokenId];
        if (bytes(_parcelId).length == 0) {
            return TitleVerificationView({
                exists:            false,
                tokenId:           tokenId,
                parcelId:          "",
                currentOwner:      address(0),
                spatialHash:       bytes32(0),
                issuedAt:          0,
                status:            ILandTitleNFT.TitleStatus.Active,
                isRevoked:         false,
                revocationGround:  ILandTitleNFT.RevocationGround.OverridingPublicInterest,
                revokedAt:         0,
                gazetteRefHash:    bytes32(0),
                lastDeedRefHash:   bytes32(0),
                lastTransferredAt: 0
            });
        }

        ILandTitleNFT.TitleMetadata memory meta = landTitleNFT.getTitleMetadata(tokenId);
        return TitleVerificationView({
            exists:            true,
            tokenId:           tokenId,
            parcelId:          _parcelId,
            currentOwner:      meta.owner,
            spatialHash:       meta.spatialHash,
            issuedAt:          meta.issuedAt,
            status:            meta.status,
            isRevoked:         meta.revoked,
            revocationGround:  meta.revocationGround,
            revokedAt:         meta.revokedAt,
            gazetteRefHash:    meta.gazetteRefHash,
            lastDeedRefHash:   _lastDeedRefHash[tokenId],
            lastTransferredAt: _lastTransferredAt[tokenId]
        });
    }

    function verifyTitleByParcelId(string calldata _parcelId)
        external
        view
        override
        returns (TitleVerificationView memory)
    {
        RegistryRecord memory rec = _recordsByParcelId[_parcelId];
        if (!rec.exists) {
            return TitleVerificationView({
                exists:            false,
                tokenId:           0,
                parcelId:          _parcelId,
                currentOwner:      address(0),
                spatialHash:       bytes32(0),
                issuedAt:          0,
                status:            ILandTitleNFT.TitleStatus.Active,
                isRevoked:         false,
                revocationGround:  ILandTitleNFT.RevocationGround.OverridingPublicInterest,
                revokedAt:         0,
                gazetteRefHash:    bytes32(0),
                lastDeedRefHash:   bytes32(0),
                lastTransferredAt: 0
            });
        }
        return this.verifyTitleByTokenId(rec.tokenId);
    }
}
