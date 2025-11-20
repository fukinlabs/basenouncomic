/**
 * Script to check if contract is initialized
 */

import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

const CONTRACT_ADDRESS = "0x72B28A7Ad3dd63De52F97cC7E800d7759809C2b9" as const;

const contractABI = [
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
  {
    name: "owner",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

async function checkContractInit() {
  const publicClient = createPublicClient({
    transport: http(),
    chain: base,
  });

  console.log("🔍 Checking Contract Initialization...\n");
  console.log("Contract:", CONTRACT_ADDRESS);
  console.log("Network: Base Mainnet (Chain ID: 8453)\n");

  try {
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

    const owner = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: contractABI,
      functionName: "owner",
    });

    const totalSupply = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: contractABI,
      functionName: "totalSupply",
    });

    console.log("📋 Contract Status:");
    console.log("  Name:", name || "❌ Empty (not initialized)");
    console.log("  Symbol:", symbol || "❌ Empty (not initialized)");
    console.log("  Owner:", owner);
    console.log("  Total Supply:", totalSupply.toString());
    console.log();

    if (!name || !symbol) {
      console.log("⚠️  WARNING: Contract name and symbol are empty!");
      console.log("   This means the contract may not be properly initialized.");
      console.log("   Basescan may show 'Undefined' because of this.");
      console.log();
      console.log("💡 Solution:");
      console.log("   1. Make sure initialize() was called with correct parameters");
      console.log("   2. Check that contract is an upgradeable proxy");
      console.log("   3. If using proxy, check implementation contract");
    } else {
      console.log("✅ Contract appears to be initialized");
    }

  } catch (error) {
    console.error("❌ Error checking contract:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
    }
  }
}

checkContractInit().catch(console.error);

