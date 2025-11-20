/**
 * Script to check mint status and diagnose mint issues
 * 
 * Usage:
 *   npx tsx scripts/check-mint-status.ts <address> <fid>
 * 
 * Example:
 *   npx tsx scripts/check-mint-status.ts 0x123... 12345
 */

import { createPublicClient, http, parseAbi } from "viem";
import { base } from "viem/chains";

const CONTRACT_ADDRESS = "0x72B28A7Ad3dd63De52F97cC7E800d7759809C2b9" as const;

const contractABI = parseAbi([
  "function authorizedSigner() view returns (address)",
  "function hasAddressMinted(address) view returns (bool)",
  "function isFidUsed(uint256) view returns (bool)",
  "function totalSupply() view returns (uint256)",
  "function nextId() view returns (uint256)",
  "function MAX_SUPPLY() view returns (uint256)",
  "function getFidByTokenId(uint256) view returns (uint256)",
  "function getMinterByFid(uint256) view returns (address)",
]);

async function checkMintStatus(address?: string, fid?: string) {
  const publicClient = createPublicClient({
    transport: http(),
    chain: base,
  });

  console.log("🔍 Checking Mint Status...\n");
  console.log("Contract:", CONTRACT_ADDRESS);
  console.log("Network: Base Mainnet (Chain ID: 8453)\n");

  try {
    // Note: Contract no longer uses signature verification
    console.log("✅ Contract: Public minting (no signature required)");

    // Check total supply
    const totalSupply = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: contractABI,
      functionName: "totalSupply",
    });

    const nextId = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: contractABI,
      functionName: "nextId",
    });

    const maxSupply = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: contractABI,
      functionName: "MAX_SUPPLY",
    });

    console.log("\n📊 Supply Status:");
    console.log("  Total Supply:", totalSupply.toString());
    console.log("  Next ID:", nextId.toString());
    console.log("  Max Supply:", maxSupply.toString());
    console.log("  Remaining:", (maxSupply - nextId).toString());

    if (nextId >= maxSupply) {
      console.log("  ⚠️  WARNING: Max supply reached! Cannot mint anymore.");
    }

    // Check address status
    if (address) {
      console.log("\n👤 Address Status:", address);
      const hasMinted = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: contractABI,
        functionName: "hasAddressMinted",
        args: [address as `0x${string}`],
      });

      if (hasMinted) {
        console.log("  ❌ This address has already minted");
      } else {
        console.log("  ✅ This address can mint");
      }
    }

    // Check FID status
    if (fid) {
      const fidNumber = BigInt(fid);
      console.log("\n🆔 FID Status:", fid);
      
      const isFidUsed = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: contractABI,
        functionName: "isFidUsed",
        args: [fidNumber],
      });

      if (isFidUsed) {
        console.log("  ❌ This FID has already been used");
        
        // Try to get minter info
        try {
          const minter = await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: contractABI,
            functionName: "getMinterByFid",
            args: [fidNumber],
          });
          console.log("  📍 Minter address:", minter);
        } catch {
          // Ignore if not found
        }
      } else {
        console.log("  ✅ This FID is available");
      }

      // Validate FID range
      if (fidNumber <= BigInt(0) || fidNumber >= BigInt(1000000)) {
        console.log("  ⚠️  WARNING: FID must be between 1 and 999,999");
      }
    }

    // Summary
    console.log("\n📋 Summary:");
    console.log("  - Contract: Public minting (no signature required)");
    console.log("  - Supply status:", nextId < maxSupply ? "✅ Can mint" : "❌ Full");
    
    if (address && fid) {
      const hasMinted = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: contractABI,
        functionName: "hasAddressMinted",
        args: [address as `0x${string}`],
      });
      
      const isFidUsed = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: contractABI,
        functionName: "isFidUsed",
        args: [BigInt(fid)],
      });

      const fidNumber = BigInt(fid);
      const validFidRange = fidNumber > BigInt(0) && fidNumber < BigInt(1000000);

      if (!hasMinted && !isFidUsed && validFidRange && nextId < maxSupply) {
        console.log("  ✅ All checks passed! You should be able to mint.");
        console.log("  ⚠️  If mint still fails, check signature verification.");
      } else {
        console.log("  ❌ Some checks failed. See details above.");
      }
    }

  } catch (error) {
    console.error("❌ Error checking contract:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
    }
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const address = args[0];
const fid = args[1];

if (!address && !fid) {
  console.log("Usage: npx tsx scripts/check-mint-status.ts [address] [fid]");
  console.log("Example: npx tsx scripts/check-mint-status.ts 0x123... 12345");
  console.log("\nChecking general contract status...\n");
}

checkMintStatus(address, fid).catch(console.error);

