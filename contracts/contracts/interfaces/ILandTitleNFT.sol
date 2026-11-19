// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title  ILandTitleNFT
 * @notice Interface for ANAGU's ERC-721 digital land title token on Polygon PoS / Amoy.
 * @dev    On-chain records MUST NOT contain personal identifiable information (NIN, names,
 *         private documents). Only non-sensitive parcel references, WKT spatial hashes,
 *         metadata URIs, and cryptographic statutory hashes are stored.
 */
interface ILandTitleNFT is IERC721 {
    /// @notice Lifecycle status of an issued digital land title token.
    enum TitleStatus {
        Active,   // 0 — Valid, transferable only by REGISTRAR_ROLE
        Revoked   // 1 — Permanently revoked under Land Use Act (1978) s.28
    }

    /// @notice Statutory revocation grounds under Nigeria's Land Use Act (1978), Section 28.
    enum RevocationGround {
        OverridingPublicInterest,   // 0
        BreachOfStatutoryCondition  // 1
    }

    /// @notice Non-sensitive on-chain title summary for public verification.
    struct TitleMetadata {
        uint256          tokenId;
        address          owner;
        string           parcelId;
        bytes32          spatialHash;
        uint256          issuedAt;
        TitleStatus      status;
        bool             revoked;
        RevocationGround revocationGround;
        uint256          revokedAt;
        bytes32          gazetteRefHash;
    }

    event TitleIssued(
        uint256 indexed tokenId,
        address indexed owner,
        string  parcelId,
        bytes32 spatialHash,
        uint256 timestamp
    );

    event TitleTransferred(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        bytes32 deedRefHash,
        uint256 timestamp
    );

    event TitleRevoked(
        uint256 indexed tokenId,
        RevocationGround ground,
        address indexed revokedBy,
        uint256 timestamp
    );

    event TitleStatusChanged(
        uint256 indexed tokenId,
        TitleStatus previousStatus,
        TitleStatus newStatus,
        bytes32 refHash,
        address indexed actor,
        uint256 timestamp
    );

    function REGISTRAR_ROLE() external view returns (bytes32);
    function GOVERNOR_ROLE() external view returns (bytes32);
    function PAUSER_ROLE() external view returns (bytes32);

    function issueTitle(
        address         to,
        string calldata _parcelId,
        bytes32         _spatialHash,
        string calldata _tokenURI
    ) external returns (uint256 tokenId);

    function registrarTransfer(address from, address to, uint256 tokenId) external;

    function registrarTransferWithRef(
        address from,
        address to,
        uint256 tokenId,
        bytes32 deedRefHash
    ) external;

    function revoke(uint256 tokenId, RevocationGround ground) external;

    function revokeWithReference(
        uint256          tokenId,
        RevocationGround ground,
        bytes32          gazetteRefHash
    ) external;

    function isRevoked(uint256 tokenId) external view returns (bool);
    function titleStatus(uint256 tokenId) external view returns (TitleStatus);
    function spatialHash(uint256 tokenId) external view returns (bytes32);
    function parcelId(uint256 tokenId) external view returns (string memory);
    function revocationGround(uint256 tokenId) external view returns (RevocationGround);
    function revokedAt(uint256 tokenId) external view returns (uint256);
    function gazetteRefHash(uint256 tokenId) external view returns (bytes32);
    function totalSupply() external view returns (uint256);
    function getTitleMetadata(uint256 tokenId) external view returns (TitleMetadata memory);
}
