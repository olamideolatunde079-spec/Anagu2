// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./interfaces/ILandTitleNFT.sol";

/**
 * @title  LandTitleNFT
 * @notice ERC-721 digital land title token for the ANAGU Land Administration Framework
 *         (deployed to Polygon Amoy testnet for development and verification).
 *
 * @dev    Security & legal governance invariants:
 *
 *  1. Owner-initiated transfers and ERC-721 approvals are DISABLED.
 *     All transfers must be executed by an address holding REGISTRAR_ROLE.
 *     approve() and setApprovalForAll() revert to prevent dead transactions
 *     and marketplace/phishing approval abuse.
 *
 *  2. Statutory revocation is restricted strictly to GOVERNOR_ROLE under Nigeria's
 *     Land Use Act (1978), Section 28:
 *       - OverridingPublicInterest (0)
 *       - BreachOfStatutoryCondition (1)
 *     Revocation is permanent and immutable; the original issuance record is preserved.
 *
 *  3. Revoked tokens cannot be transferred (enforced in _beforeTokenTransfer),
 *     even by REGISTRAR_ROLE.
 *
 *  4. Privacy & Anti-PII constraint:
 *     No National Identification Numbers (NINs), personal names, emails, or
 *     confidential documents are stored on-chain. Only opaque parcel identifiers,
 *     WKT spatial hashes, metadata URIs, and cryptographic statutory hashes are recorded.
 *
 *  5. Legal boundary:
 *     This contract records and enforces institutional approvals; it does not
 *     independently confer or extinguish statutory title without authorised
 *     Nigerian land registry and Governor sign-off.
 */
contract LandTitleNFT is ERC721, ERC721URIStorage, AccessControl, Pausable, ILandTitleNFT {
    using Counters for Counters.Counter;

    // ── Roles ──────────────────────────────────────────────────────────────
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 public constant GOVERNOR_ROLE  = keccak256("GOVERNOR_ROLE");
    bytes32 public constant PAUSER_ROLE    = keccak256("PAUSER_ROLE");

    // ── State ──────────────────────────────────────────────────────────────
    Counters.Counter private _tokenIdCounter;

    mapping(uint256 => bool)             public  isRevoked;
    mapping(uint256 => TitleStatus)      public  titleStatus;
    mapping(uint256 => bytes32)          public  spatialHash;       // keccak256 of parcel WKT
    mapping(uint256 => string)           public  parcelId;          // opaque off-chain parcel ID
    mapping(uint256 => uint256)          public  issuedAt;
    mapping(uint256 => RevocationGround) public  revocationGround;
    mapping(uint256 => uint256)          public  revokedAt;
    mapping(uint256 => bytes32)          public  gazetteRefHash;    // keccak256 of Gazette ref

    // Enforce 1-to-1 parcelId -> tokenId uniqueness even if called directly by a registrar
    mapping(bytes32 => uint256)          private _tokenByParcelHash;

    // ── Constructor ────────────────────────────────────────────────────────
    constructor(address adminAddress) ERC721("AnaguLandTitle", "ALT") {
        require(adminAddress != address(0), "LandTitleNFT: zero admin address");
        _grantRole(DEFAULT_ADMIN_ROLE, adminAddress);
        _grantRole(REGISTRAR_ROLE,     adminAddress);
        _grantRole(PAUSER_ROLE,        adminAddress);
        // Intentionally do NOT grant GOVERNOR_ROLE automatically to adminAddress;
        // separation of executive statutory revocation authority requires explicit grant.
    }

    // ── Emergency circuit breaker (issuance/transfers only) ────────────────
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // ── Issuance ───────────────────────────────────────────────────────────
    function issueTitle(
        address         to,
        string calldata _parcelId,
        bytes32         _spatialHash,
        string calldata _tokenURI
    )
        external
        override
        onlyRole(REGISTRAR_ROLE)
        whenNotPaused
        returns (uint256 tokenId)
    {
        require(to != address(0),             "LandTitleNFT: zero owner address");
        require(bytes(_parcelId).length > 0,  "LandTitleNFT: empty parcel ID");
        require(_spatialHash != bytes32(0),   "LandTitleNFT: zero spatial hash");
        require(bytes(_tokenURI).length > 0,  "LandTitleNFT: empty token URI");

        bytes32 parcelHash = keccak256(bytes(_parcelId));
        require(_tokenByParcelHash[parcelHash] == 0, "LandTitleNFT: parcel already issued");

        _tokenIdCounter.increment();
        tokenId = _tokenIdCounter.current();

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, _tokenURI);

        spatialHash[tokenId]           = _spatialHash;
        parcelId[tokenId]              = _parcelId;
        issuedAt[tokenId]              = block.timestamp;
        titleStatus[tokenId]           = TitleStatus.Active;
        _tokenByParcelHash[parcelHash] = tokenId;

        emit TitleIssued(tokenId, to, _parcelId, _spatialHash, block.timestamp);
    }

    // ── Statutory revocation (LUA 1978, s.28) ──────────────────────────────
    /// @notice Revoke a title on a statutory Land Use Act §28 ground (without explicit Gazette hash).
    function revoke(uint256 tokenId, RevocationGround ground)
        external
        override
        onlyRole(GOVERNOR_ROLE)
    {
        _executeRevocation(tokenId, ground, bytes32(0));
    }

    /// @notice Revoke a title with an immutable hash of the State Gazette notice reference.
    function revokeWithReference(
        uint256          tokenId,
        RevocationGround ground,
        bytes32          _gazetteRefHash
    )
        external
        override
        onlyRole(GOVERNOR_ROLE)
    {
        require(_gazetteRefHash != bytes32(0), "LandTitleNFT: zero gazette hash");
        _executeRevocation(tokenId, ground, _gazetteRefHash);
    }

    function _executeRevocation(
        uint256          tokenId,
        RevocationGround ground,
        bytes32          _gazetteRefHash
    ) internal {
        require(_exists(tokenId),    "LandTitleNFT: token does not exist");
        require(!isRevoked[tokenId], "LandTitleNFT: already revoked");

        isRevoked[tokenId]        = true;
        titleStatus[tokenId]      = TitleStatus.Revoked;
        revocationGround[tokenId] = ground;
        revokedAt[tokenId]        = block.timestamp;
        gazetteRefHash[tokenId]   = _gazetteRefHash;

        emit TitleRevoked(tokenId, ground, msg.sender, block.timestamp);
        emit TitleStatusChanged(
            tokenId,
            TitleStatus.Active,
            TitleStatus.Revoked,
            _gazetteRefHash,
            msg.sender,
            block.timestamp
        );
    }

    // ── Registry-controlled transfers ──────────────────────────────────────
    function registrarTransfer(address from, address to, uint256 tokenId)
        external
        override
        onlyRole(REGISTRAR_ROLE)
        whenNotPaused
    {
        _executeRegistrarTransfer(from, to, tokenId, bytes32(0));
    }

    function registrarTransferWithRef(
        address from,
        address to,
        uint256 tokenId,
        bytes32 deedRefHash
    )
        external
        override
        onlyRole(REGISTRAR_ROLE)
        whenNotPaused
    {
        require(deedRefHash != bytes32(0), "LandTitleNFT: zero deed reference hash");
        _executeRegistrarTransfer(from, to, tokenId, deedRefHash);
    }

    function _executeRegistrarTransfer(
        address from,
        address to,
        uint256 tokenId,
        bytes32 deedRefHash
    ) internal {
        require(from != address(0), "LandTitleNFT: transfer from zero address");
        require(to != address(0),   "LandTitleNFT: transfer to zero address");
        require(from != to,         "LandTitleNFT: self-transfer not allowed");
        _transfer(from, to, tokenId); // _beforeTokenTransfer enforces !isRevoked
        emit TitleTransferred(tokenId, from, to, deedRefHash, block.timestamp);
    }

    // ── Block ALL direct ERC-721 transfer and approval calls ───────────────
    function transferFrom(address from, address to, uint256 tokenId)
        public
        override(ERC721, IERC721)
        whenNotPaused
    {
        require(hasRole(REGISTRAR_ROLE, msg.sender), "LandTitleNFT: only REGISTRAR can transfer");
        _executeRegistrarTransfer(from, to, tokenId, bytes32(0));
    }

    function safeTransferFrom(address from, address to, uint256 tokenId)
        public
        override(ERC721, IERC721)
        whenNotPaused
    {
        require(hasRole(REGISTRAR_ROLE, msg.sender), "LandTitleNFT: only REGISTRAR can transfer");
        require(from != address(0), "LandTitleNFT: transfer from zero address");
        require(to != address(0),   "LandTitleNFT: transfer to zero address");
        require(from != to,         "LandTitleNFT: self-transfer not allowed");
        _safeTransfer(from, to, tokenId, "");
        emit TitleTransferred(tokenId, from, to, bytes32(0), block.timestamp);
    }

    function safeTransferFrom(
        address from, address to, uint256 tokenId, bytes memory data
    )
        public
        override(ERC721, IERC721)
        whenNotPaused
    {
        require(hasRole(REGISTRAR_ROLE, msg.sender), "LandTitleNFT: only REGISTRAR can transfer");
        require(from != address(0), "LandTitleNFT: transfer from zero address");
        require(to != address(0),   "LandTitleNFT: transfer to zero address");
        require(from != to,         "LandTitleNFT: self-transfer not allowed");
        _safeTransfer(from, to, tokenId, data);
        emit TitleTransferred(tokenId, from, to, bytes32(0), block.timestamp);
    }

    function approve(address, uint256) public pure override(ERC721, IERC721) {
        revert("LandTitleNFT: approvals disabled; registry-controlled");
    }

    function setApprovalForAll(address, bool) public pure override(ERC721, IERC721) {
        revert("LandTitleNFT: approvals disabled; registry-controlled");
    }

    // ── _beforeTokenTransfer: block revoked token transfers ────────────────
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override {
        require(!isRevoked[tokenId], "LandTitleNFT: token is revoked");
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    // ── View helpers ────────────────────────────────────────────────────────
    function totalSupply() external view override returns (uint256) {
        return _tokenIdCounter.current();
    }

    function getTokenIdByParcelId(string calldata _parcelId) external view returns (uint256) {
        return _tokenByParcelHash[keccak256(bytes(_parcelId))];
    }

    function getTitleMetadata(uint256 tokenId)
        external
        view
        override
        returns (TitleMetadata memory)
    {
        require(_exists(tokenId), "LandTitleNFT: token does not exist");
        return TitleMetadata({
            tokenId:          tokenId,
            owner:            ownerOf(tokenId),
            parcelId:         parcelId[tokenId],
            spatialHash:      spatialHash[tokenId],
            issuedAt:         issuedAt[tokenId],
            status:           titleStatus[tokenId],
            revoked:          isRevoked[tokenId],
            revocationGround: revocationGround[tokenId],
            revokedAt:        revokedAt[tokenId],
            gazetteRefHash:   gazetteRefHash[tokenId]
        });
    }

    // ── Required OZ overrides ───────────────────────────────────────────────
    function tokenURI(uint256 tokenId)
        public view override(ERC721, ERC721URIStorage) returns (string memory)
    { return super.tokenURI(tokenId); }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721URIStorage, AccessControl, IERC165) returns (bool)
    { return super.supportsInterface(interfaceId); }

    function _burn(uint256 tokenId)
        internal override(ERC721, ERC721URIStorage)
    { super._burn(tokenId); }
}
