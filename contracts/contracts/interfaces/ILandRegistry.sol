// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ILandTitleNFT.sol";

/**
 * @title  ILandRegistry
 * @notice Institutional registry coordinator interface for ANAGU land title issuance,
 *         authorised transfers, and public status verification.
 * @dev    Technical execution on-chain reflects statutory approvals recorded off-chain
 *         by licensed surveyors, legal officers, Deeds Registrars, and Governors;
 *         this contract does not independently grant or extinguish legal land rights.
 */
interface ILandRegistry {
    struct RegistryRecord {
        uint256 tokenId;
        string  parcelId;
        address owner;
        uint256 issuedAt;
        bool    exists;
    }

    struct TitleVerificationView {
        bool                           exists;
        uint256                        tokenId;
        string                         parcelId;
        address                        currentOwner;
        bytes32                        spatialHash;
        uint256                        issuedAt;
        ILandTitleNFT.TitleStatus      status;
        bool                           isRevoked;
        ILandTitleNFT.RevocationGround revocationGround;
        uint256                        revokedAt;
        bytes32                        gazetteRefHash;
        bytes32                        lastDeedRefHash;
        uint256                        lastTransferredAt;
    }

    event RegistrationRecorded(
        uint256 indexed tokenId,
        string  parcelId,
        address indexed owner,
        uint256 timestamp
    );

    event TransferRecorded(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        uint256 timestamp
    );

    event TransferReferenceRecorded(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        bytes32 deedRefHash,
        uint256 timestamp
    );

    function REGISTRAR_ROLE() external view returns (bytes32);
    function PAUSER_ROLE() external view returns (bytes32);

    function registerTitle(
        address         owner,
        string calldata _parcelId,
        bytes32         _spatialHash,
        string calldata _tokenURI
    ) external returns (uint256 tokenId);

    function transferTitle(uint256 tokenId, address from, address to) external;

    function transferTitleWithReference(
        uint256 tokenId,
        address from,
        address to,
        bytes32 deedRefHash
    ) external;

    function getRecordByParcelId(string calldata _parcelId) external view returns (RegistryRecord memory);
    function getParcelIdByTokenId(uint256 tokenId) external view returns (string memory);
    function isParcelRegistered(string calldata _parcelId) external view returns (bool);
    function verifyTitleByTokenId(uint256 tokenId) external view returns (TitleVerificationView memory);
    function verifyTitleByParcelId(string calldata _parcelId) external view returns (TitleVerificationView memory);
}
