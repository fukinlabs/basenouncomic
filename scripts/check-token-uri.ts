/**
 * Script to check tokenURI for a specific token
 * 
 * Usage:
 *   npx tsx scripts/check-token-uri.ts <tokenId>
 * 
 * Example:
 *   npx tsx scripts/check-token-uri.ts 0
 */

import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

const CONTRACT_ADDRESS = "0x61170C2a2a3fBEe1A9E073F628113FCc11Ad662E" as const;

const contractABI = [
  {
    name: "tokenURI",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "name",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

async function checkTokenURI(tokenId: string) {
  const publicClient = createPublicClient({
    transport: http(),
    chain: base,
  });

  console.log("🔍 Checking Token URI...\n");
  console.log("Contract:", CONTRACT_ADDRESS);
  console.log("Token ID:", tokenId);
  console.log("Network: Base Mainnet (Chain ID: 8453)\n");

  try {
    // Check contract name and symbol
    const name = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: contractABI,
      functionName: "name",
    });

    const symbol = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: contractABI,
      functionName: "symbol",
    });

    console.log("📋 Contract Info:");
    console.log("  Name:", name);
    console.log("  Symbol:", symbol);
    console.log();

    // Get tokenURI
    const tokenURI = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: contractABI,
      functionName: "tokenURI",
      args: [BigInt(tokenId)],
    });

    console.log("🔗 Token URI:");
    console.log("  Length:", tokenURI.length);
    console.log("  Preview:", tokenURI.substring(0, 100) + (tokenURI.length > 100 ? "..." : ""));
    console.log();

    // Try to decode if it's base64
    if (tokenURI.startsWith("data:application/json;base64,")) {
      console.log("✅ Token URI is base64 encoded JSON");
      
      try {
        const base64Data = tokenURI.replace("data:application/json;base64,", "");
        const jsonStr = Buffer.from(base64Data, "base64").toString("utf-8");
        
        console.log("\n📄 Decoded JSON:");
        console.log(jsonStr);
        console.log();

        // Try to parse JSON
        const metadata = JSON.parse(jsonStr);
        
        console.log("✅ JSON is valid!");
        console.log("\n📊 Metadata Details:");
        console.log("  Name:", metadata.name || "❌ Missing");
        console.log("  Description:", metadata.description ? metadata.description.substring(0, 50) + "..." : "❌ Missing");
        console.log("  Image:", metadata.image ? metadata.image.substring(0, 80) + "..." : "❌ Missing");
        console.log("  Attributes:", metadata.attributes ? metadata.attributes.length : 0);
        
        if (metadata.attributes) {
          console.log("\n  Attributes:");
          metadata.attributes.forEach((attr: any) => {
            console.log(`    - ${attr.trait_type}: ${attr.value}`);
          });
        }

        // Check image format
        if (metadata.image) {
          console.log("\n🖼️  Image Analysis:");
          if (metadata.image.startsWith("ipfs://")) {
            console.log("  ✅ IPFS format (Basescan compatible: 100%)");
          } else if (metadata.image.startsWith("data:image/")) {
            console.log("  ✅ Base64 image format (Basescan compatible: 100%)");
          } else if (metadata.image.startsWith("data:text/html")) {
            console.log("  ⚠️  HTML base64 format (Basescan compatible: 0%)");
            console.log("  💡 Consider using IPFS or PNG base64 instead");
          } else if (metadata.image.startsWith("http")) {
            console.log("  ✅ HTTP URL format");
          } else {
            console.log("  ⚠️  Unknown format:", metadata.image.substring(0, 50));
          }
        }

      } catch (error) {
        console.error("❌ Error decoding/parsing JSON:", error);
        if (error instanceof Error) {
          console.error("   Message:", error.message);
        }
      }
    } else if (tokenURI.startsWith("ipfs://")) {
      console.log("✅ Token URI is IPFS hash");
      console.log("  IPFS Hash:", tokenURI);
      console.log("  💡 Basescan will fetch from IPFS gateway");
    } else if (tokenURI.startsWith("http")) {
      console.log("✅ Token URI is HTTP URL");
      console.log("  URL:", tokenURI);
    } else {
      console.log("⚠️  Unknown tokenURI format");
      console.log("  Full URI:", tokenURI);
    }

  } catch (error) {
    console.error("❌ Error checking token URI:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
    }
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const tokenId = args[0] || "0";

checkTokenURI(tokenId).catch(console.error);

