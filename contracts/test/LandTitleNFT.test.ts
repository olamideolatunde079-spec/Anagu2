import { expect } from "chai";
import { ethers } from "hardhat";
import { LandTitleNFT } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * LandTitleNFT — Full test suite (35 cases)
 *
 * Component 2 build-gate: 6 required cases for Table 2B in PROJECT.md:
 *   ✓ 1. Governor-role revocation succeeds
 *   ✓ 2. Non-Governor revocation reverts
 *   ✓ 3. Transfer of a revoked token reverts
 *   ✓ 4. NFT issuance (REGISTRAR_ROLE only)
 *   ✓ 5. Owner-initiated transfer is blocked
 *   ✓ 6. Events emitted correctly
 */
describe("LandTitleNFT", () => {
  let nft: LandTitleNFT;
  let admin: HardhatEthersSigner;
  let registrar: HardhatEthersSigner;
  let governor: HardhatEthersSigner;
  let owner: HardhatEthersSigner;
  let buyer: HardhatEthersSigner;
  let randomUser: HardhatEthersSigner;

  const PARCEL_ID    = "parcel-uuid-test-001";
  const SPATIAL_HASH = ethers.keccak256(
    ethers.toUtf8Bytes("POLYGON((3.396 6.454,3.397 6.454,3.397 6.455,3.396 6.455,3.396 6.454))")
  );
  const TOKEN_URI = "ipfs://QmAnaguTestHash";

  beforeEach(async () => {
    [admin, registrar, governor, owner, buyer, randomUser] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("LandTitleNFT");
    nft = (await Factory.deploy(admin.address)) as LandTitleNFT;
    await nft.waitForDeployment();

    await nft.connect(admin).grantRole(await nft.REGISTRAR_ROLE(), registrar.address);
    await nft.connect(admin).grantRole(await nft.GOVERNOR_ROLE(),  governor.address);
  });

  async function issueTitle(to = owner.address): Promise<bigint> {
    await nft.connect(registrar).issueTitle(to, PARCEL_ID, SPATIAL_HASH, TOKEN_URI);
    return BigInt(1);
  }

  // ── Issuance ─────────────────────────────────────────────────────────────
  describe("NFT Issuance", () => {
    it("REGISTRAR_ROLE can issue a title", async () => {
      await expect(
        nft.connect(registrar).issueTitle(owner.address, PARCEL_ID, SPATIAL_HASH, TOKEN_URI)
      ).to.not.be.reverted;
      expect(await nft.ownerOf(1)).to.equal(owner.address);
    });

    it("non-REGISTRAR cannot issue a title", async () => {
      await expect(
        nft.connect(randomUser).issueTitle(owner.address, PARCEL_ID, SPATIAL_HASH, TOKEN_URI)
      ).to.be.reverted;
    });

    it("stores parcelId and spatialHash on the token", async () => {
      await issueTitle();
      expect(await nft.parcelId(1n)).to.equal(PARCEL_ID);
      expect(await nft.spatialHash(1n)).to.equal(SPATIAL_HASH);
    });

    it("emits TitleIssued event", async () => {
      await expect(
        nft.connect(registrar).issueTitle(owner.address, PARCEL_ID, SPATIAL_HASH, TOKEN_URI)
      ).to.emit(nft, "TitleIssued").withArgs(
        1n, owner.address, PARCEL_ID, SPATIAL_HASH,
        (await ethers.provider.getBlock("latest"))!.timestamp + 1
      );
    });

    it("reverts on zero owner address", async () => {
      await expect(
        nft.connect(registrar).issueTitle(ethers.ZeroAddress, PARCEL_ID, SPATIAL_HASH, TOKEN_URI)
      ).to.be.revertedWith("LandTitleNFT: zero owner address");
    });

    it("increments totalSupply", async () => {
      expect(await nft.totalSupply()).to.equal(0n);
      await issueTitle();
      expect(await nft.totalSupply()).to.equal(1n);
    });
  });

  // ── Transfer control ──────────────────────────────────────────────────────
  describe("Transfer control", () => {
    beforeEach(async () => { await issueTitle(); });

    it("[Table 2A] REGISTRAR_ROLE can transfer via transferFrom", async () => {
      await expect(
        nft.connect(registrar).transferFrom(owner.address, buyer.address, 1n)
      ).to.not.be.reverted;
      expect(await nft.ownerOf(1n)).to.equal(buyer.address);
    });

    it("[Table 2A] owner-initiated transfer is rejected", async () => {
      await expect(
        nft.connect(owner).transferFrom(owner.address, buyer.address, 1n)
      ).to.be.revertedWith("LandTitleNFT: only REGISTRAR can transfer");
    });

    it("[Table 2A] random user cannot transfer", async () => {
      await expect(
        nft.connect(randomUser).transferFrom(owner.address, buyer.address, 1n)
      ).to.be.revertedWith("LandTitleNFT: only REGISTRAR can transfer");
    });

    it("registrarTransfer() also works for REGISTRAR_ROLE", async () => {
      await nft.connect(registrar).registrarTransfer(owner.address, buyer.address, 1n);
      expect(await nft.ownerOf(1n)).to.equal(buyer.address);
    });
  });

  // ── Statutory revocation (Component 2, Part C) ───────────────────────────
  describe("Statutory revocation", () => {
    beforeEach(async () => { await issueTitle(); });

    it("[Table 2B row 1] Governor-role revocation succeeds", async () => {
      await nft.connect(governor).revoke(1n, 0); // 0 = OverridingPublicInterest
      expect(await nft.isRevoked(1n)).to.equal(true);
    });

    it("[Table 2B row 2] non-Governor revocation reverts (random user)", async () => {
      await expect(nft.connect(randomUser).revoke(1n, 0)).to.be.reverted;
    });

    it("[Table 2B row 2] non-Governor revocation reverts (owner)", async () => {
      await expect(nft.connect(owner).revoke(1n, 0)).to.be.reverted;
    });

    it("[Table 2B row 2] non-Governor revocation reverts (registrar)", async () => {
      await expect(nft.connect(registrar).revoke(1n, 0)).to.be.reverted;
    });

    it("[Table 2B row 3] transfer of a revoked token reverts", async () => {
      await nft.connect(governor).revoke(1n, 1); // 1 = BreachOfStatutoryCondition
      await expect(
        nft.connect(registrar).transferFrom(owner.address, buyer.address, 1n)
      ).to.be.revertedWith("LandTitleNFT: token is revoked");
    });

    it("double-revocation reverts", async () => {
      await nft.connect(governor).revoke(1n, 0);
      await expect(nft.connect(governor).revoke(1n, 0))
        .to.be.revertedWith("LandTitleNFT: already revoked");
    });

    it("revoking a non-existent token reverts", async () => {
      await expect(nft.connect(governor).revoke(9999n, 0))
        .to.be.revertedWith("LandTitleNFT: token does not exist");
    });

    it("emits TitleRevoked with OverridingPublicInterest", async () => {
      await expect(nft.connect(governor).revoke(1n, 0))
        .to.emit(nft, "TitleRevoked")
        .withArgs(1n, 0, governor.address,
          (await ethers.provider.getBlock("latest"))!.timestamp + 1);
    });

    it("emits TitleRevoked with BreachOfStatutoryCondition", async () => {
      await expect(nft.connect(governor).revoke(1n, 1))
        .to.emit(nft, "TitleRevoked")
        .withArgs(1n, 1, governor.address,
          (await ethers.provider.getBlock("latest"))!.timestamp + 1);
    });

    it("[Table 2B] measures gas cost of revoke()", async () => {
      const tx      = await nft.connect(governor).revoke(1n, 0);
      const receipt = await tx.wait();
      console.log(`\n  📊 Gas used for revoke(): ${receipt!.gasUsed} gas`);
      console.log(`     → Record in PROJECT.md Table 2B\n`);
      expect(receipt!.gasUsed).to.be.gt(0n);
    });

    it("[Table 2B] measures confirmation time of revoke()", async () => {
      const start = Date.now();
      const tx    = await nft.connect(governor).revoke(1n, 0);
      await tx.wait();
      const ms = Date.now() - start;
      console.log(`\n  📊 revoke() confirmation: ${ms}ms (T_contract for Table 4C)\n`);
      expect(ms).to.be.gte(0);
    });
  });

  // ── Metadata ──────────────────────────────────────────────────────────────
  describe("Metadata", () => {
    it("returns correct tokenURI", async () => {
      await issueTitle();
      expect(await nft.tokenURI(1n)).to.equal(TOKEN_URI);
    });

    it("supports ERC-721 interface", async () => {
      expect(await nft.supportsInterface("0x80ac58cd")).to.equal(true);
    });

    it("supports AccessControl interface", async () => {
      expect(await nft.supportsInterface("0x7965db0b")).to.equal(true);
    });
  });

  // ── Hardened Security & Polygon Integration Readiness ────────────────────
  describe("Hardened security, approvals lock & lifecycle invariants", () => {
    it("constructor rejects zero admin address", async () => {
      const Factory = await ethers.getContractFactory("LandTitleNFT");
      await expect(Factory.deploy(ethers.ZeroAddress)).to.be.revertedWith(
        "LandTitleNFT: zero admin address"
      );
    });

    it("admin does NOT automatically receive GOVERNOR_ROLE", async () => {
      expect(await nft.hasRole(await nft.GOVERNOR_ROLE(), admin.address)).to.equal(false);
      await issueTitle();
      await expect(nft.connect(admin).revoke(1n, 0)).to.be.reverted;
    });

    it("reverts on duplicate parcelId issuance even when called directly", async () => {
      await issueTitle();
      await expect(
        nft.connect(registrar).issueTitle(buyer.address, PARCEL_ID, SPATIAL_HASH, TOKEN_URI)
      ).to.be.revertedWith("LandTitleNFT: parcel already issued");
    });

    it("reverts on empty parcelId, zero spatialHash, or empty tokenURI", async () => {
      await expect(
        nft.connect(registrar).issueTitle(owner.address, "", SPATIAL_HASH, TOKEN_URI)
      ).to.be.revertedWith("LandTitleNFT: empty parcel ID");

      await expect(
        nft.connect(registrar).issueTitle(owner.address, PARCEL_ID, ethers.ZeroHash, TOKEN_URI)
      ).to.be.revertedWith("LandTitleNFT: zero spatial hash");

      await expect(
        nft.connect(registrar).issueTitle(owner.address, PARCEL_ID, SPATIAL_HASH, "")
      ).to.be.revertedWith("LandTitleNFT: empty token URI");
    });

    it("disables ERC-721 approve() and setApprovalForAll() to prevent unauthorized/phishing approvals", async () => {
      await issueTitle();
      await expect(nft.connect(owner).approve(buyer.address, 1n)).to.be.revertedWith(
        "LandTitleNFT: approvals disabled; registry-controlled"
      );
      await expect(nft.connect(owner).setApprovalForAll(buyer.address, true)).to.be.revertedWith(
        "LandTitleNFT: approvals disabled; registry-controlled"
      );
    });

    it("blocks owner safeTransferFrom (3-arg and 4-arg)", async () => {
      await issueTitle();
      await expect(
        nft.connect(owner)["safeTransferFrom(address,address,uint256)"](owner.address, buyer.address, 1n)
      ).to.be.revertedWith("LandTitleNFT: only REGISTRAR can transfer");
      await expect(
        nft.connect(owner)["safeTransferFrom(address,address,uint256,bytes)"](
          owner.address,
          buyer.address,
          1n,
          "0x"
        )
      ).to.be.revertedWith("LandTitleNFT: only REGISTRAR can transfer");
    });

    it("rejects self-transfer and zero destination in registrarTransfer", async () => {
      await issueTitle();
      await expect(
        nft.connect(registrar).registrarTransfer(owner.address, owner.address, 1n)
      ).to.be.revertedWith("LandTitleNFT: self-transfer not allowed");
      await expect(
        nft.connect(registrar).registrarTransfer(owner.address, ethers.ZeroAddress, 1n)
      ).to.be.revertedWith("LandTitleNFT: transfer to zero address");
    });

    it("registrarTransferWithRef emits TitleTransferred with deed reference hash", async () => {
      await issueTitle();
      const deedHash = ethers.keccak256(ethers.toUtf8Bytes("DEED-LAG-2026-0091"));
      await expect(
        nft.connect(registrar).registrarTransferWithRef(owner.address, buyer.address, 1n, deedHash)
      )
        .to.emit(nft, "TitleTransferred")
        .withArgs(
          1n,
          owner.address,
          buyer.address,
          deedHash,
          (await ethers.provider.getBlock("latest"))!.timestamp + 1
        );
      expect(await nft.ownerOf(1n)).to.equal(buyer.address);
    });

    it("revokeWithReference stores status, ground, gazetteRefHash, and emits TitleStatusChanged", async () => {
      await issueTitle();
      const gazetteHash = ethers.keccak256(ethers.toUtf8Bytes("LGSG/VOL-60/NO-12"));
      await expect(nft.connect(governor).revokeWithReference(1n, 0, gazetteHash))
        .to.emit(nft, "TitleStatusChanged")
        .withArgs(
          1n,
          0,
          1,
          gazetteHash,
          governor.address,
          (await ethers.provider.getBlock("latest"))!.timestamp + 1
        );

      const meta = await nft.getTitleMetadata(1n);
      expect(meta.status).to.equal(1n); // TitleStatus.Revoked
      expect(meta.revoked).to.equal(true);
      expect(meta.revocationGround).to.equal(0n);
      expect(meta.gazetteRefHash).to.equal(gazetteHash);
      expect(meta.revokedAt).to.be.gt(0n);
    });

    it("revokeWithReference rejects zero gazette hash", async () => {
      await issueTitle();
      await expect(
        nft.connect(governor).revokeWithReference(1n, 0, ethers.ZeroHash)
      ).to.be.revertedWith("LandTitleNFT: zero gazette hash");
    });

    it("PAUSER_ROLE can pause issuance/transfers while GOVERNOR_ROLE can still execute statutory revocation", async () => {
      await issueTitle();
      await expect(nft.connect(randomUser).pause()).to.be.reverted;

      await nft.connect(admin).pause();
      await expect(
        nft.connect(registrar).issueTitle(buyer.address, "parcel-002", SPATIAL_HASH, TOKEN_URI)
      ).to.be.revertedWith("Pausable: paused");
      await expect(
        nft.connect(registrar).registrarTransfer(owner.address, buyer.address, 1n)
      ).to.be.revertedWith("Pausable: paused");

      // Statutory revocation by Governor remains operable even during transfer pause
      await expect(nft.connect(governor).revoke(1n, 1)).to.not.be.reverted;
      expect(await nft.isRevoked(1n)).to.equal(true);

      await nft.connect(admin).unpause();
      await expect(
        nft.connect(registrar).issueTitle(buyer.address, "parcel-002", SPATIAL_HASH, TOKEN_URI)
      ).to.not.be.reverted;
    });
  });
});
