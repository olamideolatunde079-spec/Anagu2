import { expect } from "chai";
import { ethers } from "hardhat";
import { LandTitleNFT, LandRegistry } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("LandRegistry", () => {
  let nft:      LandTitleNFT;
  let registry: LandRegistry;
  let admin:      HardhatEthersSigner;
  let registrar:  HardhatEthersSigner;
  let governor:   HardhatEthersSigner;
  let owner:      HardhatEthersSigner;
  let buyer:      HardhatEthersSigner;
  let randomUser: HardhatEthersSigner;

  const PARCEL_ID    = "parcel-registry-test-001";
  const SPATIAL_HASH = ethers.keccak256(ethers.toUtf8Bytes("POLYGON((3.396 6.454,...))"));
  const TOKEN_URI    = "ipfs://QmRegistryTestHash";

  beforeEach(async () => {
    [admin, registrar, governor, owner, buyer, randomUser] = await ethers.getSigners();

    const NFTFactory = await ethers.getContractFactory("LandTitleNFT");
    nft = (await NFTFactory.deploy(admin.address)) as LandTitleNFT;
    await nft.waitForDeployment();

    const RegFactory = await ethers.getContractFactory("LandRegistry");
    registry = (await RegFactory.deploy(await nft.getAddress(), admin.address)) as LandRegistry;
    await registry.waitForDeployment();

    // Grant registry contract REGISTRAR_ROLE on the NFT
    await nft.connect(admin).grantRole(await nft.REGISTRAR_ROLE(), await registry.getAddress());
    // Grant registrar signer REGISTRAR_ROLE on the registry
    await registry.connect(admin).grantRole(await registry.REGISTRAR_ROLE(), registrar.address);
    // Grant governor GOVERNOR_ROLE on the NFT
    await nft.connect(admin).grantRole(await nft.GOVERNOR_ROLE(), governor.address);
  });

  describe("registerTitle", () => {
    it("REGISTRAR_ROLE can register a title", async () => {
      await expect(
        registry.connect(registrar).registerTitle(owner.address, PARCEL_ID, SPATIAL_HASH, TOKEN_URI)
      ).to.not.be.reverted;
    });

    it("emits RegistrationRecorded", async () => {
      await expect(
        registry.connect(registrar).registerTitle(owner.address, PARCEL_ID, SPATIAL_HASH, TOKEN_URI)
      ).to.emit(registry, "RegistrationRecorded");
    });

    it("marks parcel as registered", async () => {
      await registry.connect(registrar).registerTitle(owner.address, PARCEL_ID, SPATIAL_HASH, TOKEN_URI);
      expect(await registry.isParcelRegistered(PARCEL_ID)).to.equal(true);
    });

    it("reverts on duplicate parcel registration", async () => {
      await registry.connect(registrar).registerTitle(owner.address, PARCEL_ID, SPATIAL_HASH, TOKEN_URI);
      await expect(
        registry.connect(registrar).registerTitle(owner.address, PARCEL_ID, SPATIAL_HASH, TOKEN_URI)
      ).to.be.revertedWith("LandRegistry: parcel already registered");
    });

    it("non-registrar cannot register", async () => {
      await expect(
        registry.connect(randomUser).registerTitle(owner.address, PARCEL_ID, SPATIAL_HASH, TOKEN_URI)
      ).to.be.reverted;
    });

    it("getRecordByParcelId returns correct tokenId and owner", async () => {
      await registry.connect(registrar).registerTitle(owner.address, PARCEL_ID, SPATIAL_HASH, TOKEN_URI);
      const record = await registry.getRecordByParcelId(PARCEL_ID);
      expect(record.tokenId).to.equal(1n);
      expect(record.owner).to.equal(owner.address);
    });
  });

  describe("transferTitle", () => {
    beforeEach(async () => {
      await registry.connect(registrar).registerTitle(owner.address, PARCEL_ID, SPATIAL_HASH, TOKEN_URI);
    });

    it("REGISTRAR_ROLE can transfer a title", async () => {
      await registry.connect(registrar).transferTitle(1n, owner.address, buyer.address);
      expect(await nft.ownerOf(1n)).to.equal(buyer.address);
    });

    it("emits TransferRecorded", async () => {
      await expect(
        registry.connect(registrar).transferTitle(1n, owner.address, buyer.address)
      ).to.emit(registry, "TransferRecorded");
    });

    it("updates ownership record after transfer", async () => {
      await registry.connect(registrar).transferTitle(1n, owner.address, buyer.address);
      const record = await registry.getRecordByParcelId(PARCEL_ID);
      expect(record.owner).to.equal(buyer.address);
    });

    it("non-registrar cannot transfer", async () => {
      await expect(
        registry.connect(randomUser).transferTitle(1n, owner.address, buyer.address)
      ).to.be.reverted;
    });

    it("[Table 2A] owner cannot directly transfer their title", async () => {
      await expect(
        nft.connect(owner).transferFrom(owner.address, buyer.address, 1n)
      ).to.be.revertedWith("LandTitleNFT: only REGISTRAR can transfer");
    });
  });

  describe("Integration: revocation blocks transfer", () => {
    it("revoked title cannot be transferred by registrar either", async () => {
      await registry.connect(registrar).registerTitle(owner.address, PARCEL_ID, SPATIAL_HASH, TOKEN_URI);
      await nft.connect(governor).revoke(1n, 0);
      await expect(
        registry.connect(registrar).transferTitle(1n, owner.address, buyer.address)
      ).to.be.revertedWith("LandTitleNFT: token is revoked");
    });

    it("LandRegistry itself cannot revoke a title without GOVERNOR_ROLE", async () => {
      expect(await nft.hasRole(await nft.GOVERNOR_ROLE(), await registry.getAddress())).to.equal(false);
    });
  });

  describe("Referenced transfers, validation, verification views & Pausable", () => {
    it("constructor rejects zero addresses", async () => {
      const RegFactory = await ethers.getContractFactory("LandRegistry");
      await expect(RegFactory.deploy(ethers.ZeroAddress, admin.address)).to.be.revertedWith(
        "LandRegistry: zero NFT address"
      );
      await expect(RegFactory.deploy(await nft.getAddress(), ethers.ZeroAddress)).to.be.revertedWith(
        "LandRegistry: zero admin address"
      );
    });

    it("registerTitle validates owner, parcelId, spatialHash, and tokenURI", async () => {
      await expect(
        registry.connect(registrar).registerTitle(ethers.ZeroAddress, PARCEL_ID, SPATIAL_HASH, TOKEN_URI)
      ).to.be.revertedWith("LandRegistry: zero owner address");
      await expect(
        registry.connect(registrar).registerTitle(owner.address, "", SPATIAL_HASH, TOKEN_URI)
      ).to.be.revertedWith("LandRegistry: empty parcel ID");
      await expect(
        registry.connect(registrar).registerTitle(owner.address, PARCEL_ID, ethers.ZeroHash, TOKEN_URI)
      ).to.be.revertedWith("LandRegistry: zero spatial hash");
      await expect(
        registry.connect(registrar).registerTitle(owner.address, PARCEL_ID, SPATIAL_HASH, "")
      ).to.be.revertedWith("LandRegistry: empty token URI");
    });

    it("transferTitleWithReference records deed reference hash and rejects invalid transfers", async () => {
      await registry.connect(registrar).registerTitle(owner.address, PARCEL_ID, SPATIAL_HASH, TOKEN_URI);
      const deedRef = ethers.keccak256(ethers.toUtf8Bytes("DEED-ABJ-2026-044"));

      await expect(
        registry.connect(registrar).transferTitleWithReference(1n, owner.address, owner.address, deedRef)
      ).to.be.revertedWith("LandRegistry: self-transfer not allowed");

      await expect(
        registry.connect(registrar).transferTitleWithReference(1n, owner.address, buyer.address, ethers.ZeroHash)
      ).to.be.revertedWith("LandRegistry: zero deed reference hash");

      await expect(
        registry.connect(registrar).transferTitleWithReference(999n, owner.address, buyer.address, deedRef)
      ).to.be.revertedWith("LandRegistry: unknown token");

      await expect(
        registry.connect(registrar).transferTitleWithReference(1n, buyer.address, randomUser.address, deedRef)
      ).to.be.revertedWith("ERC721: transfer from incorrect owner");

      await expect(
        registry.connect(registrar).transferTitleWithReference(1n, owner.address, buyer.address, deedRef)
      )
        .to.emit(registry, "TransferReferenceRecorded")
        .withArgs(
          1n,
          owner.address,
          buyer.address,
          deedRef,
          (await ethers.provider.getBlock("latest"))!.timestamp + 1
        );

      const view = await registry.verifyTitleByTokenId(1n);
      expect(view.exists).to.equal(true);
      expect(view.currentOwner).to.equal(buyer.address);
      expect(view.lastDeedRefHash).to.equal(deedRef);
      expect(view.lastTransferredAt).to.be.gt(0n);
      expect(view.isRevoked).to.equal(false);
    });

    it("verifyTitleByParcelId reflects live Governor revocation and handles unknown parcels", async () => {
      const missing = await registry.verifyTitleByParcelId("unknown-parcel");
      expect(missing.exists).to.equal(false);

      await registry.connect(registrar).registerTitle(owner.address, PARCEL_ID, SPATIAL_HASH, TOKEN_URI);
      const gazetteHash = ethers.keccak256(ethers.toUtf8Bytes("FCT-GAZ-2026-01"));
      await nft.connect(governor).revokeWithReference(1n, 1, gazetteHash);

      const verified = await registry.verifyTitleByParcelId(PARCEL_ID);
      expect(verified.exists).to.equal(true);
      expect(verified.status).to.equal(1n); // Revoked
      expect(verified.isRevoked).to.equal(true);
      expect(verified.revocationGround).to.equal(1n); // BreachOfStatutoryCondition
      expect(verified.gazetteRefHash).to.equal(gazetteHash);
    });

    it("PAUSER_ROLE can pause and unpause LandRegistry operations", async () => {
      await expect(registry.connect(randomUser).pause()).to.be.reverted;
      await registry.connect(admin).pause();
      await expect(
        registry.connect(registrar).registerTitle(owner.address, PARCEL_ID, SPATIAL_HASH, TOKEN_URI)
      ).to.be.revertedWith("Pausable: paused");
      await registry.connect(admin).unpause();
      await expect(
        registry.connect(registrar).registerTitle(owner.address, PARCEL_ID, SPATIAL_HASH, TOKEN_URI)
      ).to.not.be.reverted;
    });
  });
});
