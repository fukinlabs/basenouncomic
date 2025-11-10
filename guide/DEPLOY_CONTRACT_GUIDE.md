# Smart Contract Deployment Guide

## Contract Overview

**Contract Name:** `BasegenerateOnchainNFT`  
**File:** `DEPLOY_CONTRACT.sol`  
**Network:** Base Mainnet  
**Standard:** ERC-721 (Upgradeable)

## Features

- ✅ Mint NFT bound to Farcaster FID (one FID = one NFT)
- ✅ Supports HTML base64 (interactive canvas) and PNG base64 (static image)
- ✅ Minting cost: 0.0001 ETH
- ✅ Owner can change mint price and withdraw funds
- ✅ On-chain metadata storage (base64-encoded JSON)

## Deployment Steps

### 1. Prerequisites

- Node.js and npm installed
- Hardhat or Foundry installed
- Base network configured
- Private key with ETH for deployment

### 2. Install Dependencies

```bash
npm install @openzeppelin/contracts-upgradeable @openzeppelin/contracts
```

### 3. Deploy Contract (Using Hardhat)

#### 3.1 Create Deployment Script

Create `scripts/deploy.js`:

```javascript
const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy proxy contract
  const BasegenerateOnchainNFT = await ethers.getContractFactory("BasegenerateOnchainNFT");
  const contract = await upgrades.deployProxy(
    BasegenerateOnchainNFT,
    [deployer.address], // initialOwner
    { initializer: "initialize" }
  );

  await contract.deployed();
  console.log("Contract deployed to:", contract.address);
  console.log("Proxy address:", contract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

#### 3.2 Configure Hardhat

Add to `hardhat.config.js`:

```javascript
require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");

module.exports = {
  solidity: {
    version: "0.8.30",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    base: {
      url: "https://mainnet.base.org",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 8453,
    },
  },
};
```

#### 3.3 Deploy

```bash
npx hardhat run scripts/deploy.js --network base
```

### 4. Deploy Contract (Using Foundry)

#### 4.1 Create Deployment Script

Create `script/Deploy.s.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script} from "forge-std/Script.sol";
import {BasegenerateOnchainNFT} from "../src/DEPLOY_CONTRACT.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy implementation
        BasegenerateOnchainNFT implementation = new BasegenerateOnchainNFT();
        
        // Encode initialize function call
        bytes memory initData = abi.encodeWithSelector(
            BasegenerateOnchainNFT.initialize.selector,
            deployer // initialOwner
        );
        
        // Deploy proxy
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            initData
        );
        
        vm.stopBroadcast();
        
        console.log("Implementation deployed to:", address(implementation));
        console.log("Proxy deployed to:", address(proxy));
    }
}
```

#### 4.2 Deploy

```bash
forge script script/Deploy.s.sol:DeployScript --rpc-url https://mainnet.base.org --broadcast --verify
```

### 5. Verify Contract

After deployment, verify the contract on Basescan:

```bash
npx hardhat verify --network base <PROXY_ADDRESS> <INITIAL_OWNER>
```

Or using Foundry:

```bash
forge verify-contract <PROXY_ADDRESS> src/DEPLOY_CONTRACT.sol:BasegenerateOnchainNFT --chain-id 8453 --etherscan-api-key <API_KEY>
```

### 6. Update Frontend

After deployment, update the contract address in:

1. `app/mint/page.tsx`:
   ```typescript
   const NFT_CONTRACT_ADDRESS = "0x..."; // New contract address
   ```

2. `app/api/nft-metadata/route.ts`:
   ```typescript
   const NFT_CONTRACT_ADDRESS = "0x..."; // New contract address
   ```

3. `app/api/nft-image/[tokenId]/route.ts`:
   ```typescript
   const NFT_CONTRACT_ADDRESS = "0x..."; // New contract address
   ```

4. `app/api/nft-list/route.ts`:
   ```typescript
   const NFT_CONTRACT_ADDRESS = "0x..."; // New contract address
   ```

5. `app/api/nft-by-fid/route.ts`:
   ```typescript
   const NFT_CONTRACT_ADDRESS = "0x..."; // New contract address
   ```

6. `lib/contract-abi.json`:
   - Update with new contract ABI (if changed)

### 7. Test Contract

1. **Test Minting:**
   - Connect wallet to Base network
   - Call `mintForFid()` with FID and HTML base64
   - Verify NFT is minted correctly

2. **Test Metadata:**
   - Call `tokenURI(tokenId)` to get metadata
   - Verify metadata contains correct HTML base64

3. **Test Owner Functions:**
   - Call `setMintPrice()` to change mint price
   - Call `withdraw()` to withdraw funds

## Contract Functions

### Public Functions

- `mintForFid(address to, uint256 fid, string memory htmlBase64)` - Mint NFT (payable, 0.0001 ETH)
- `tokenURI(uint256 tokenId)` - Get NFT metadata (inherited from ERC721URIStorage)
- `ownerOf(uint256 tokenId)` - Get NFT owner (inherited from ERC721)
- `mintedFid(uint256 fid)` - Check if FID has been minted
- `nextId()` - Get next token ID
- `mintPrice()` - Get current mint price

### Owner Functions

- `setMintPrice(uint256 newPrice)` - Change mint price (onlyOwner)
- `withdraw()` - Withdraw accumulated ETH (onlyOwner)

## Important Notes

1. **Upgradeable Contract:**
   - Contract uses OpenZeppelin's upgradeable pattern
   - Deploy as proxy contract, not implementation directly
   - Can upgrade contract in the future if needed

2. **HTML Base64:**
   - Frontend generates HTML base64 using `/api/generate-html-canvas?fid=xxx`
   - HTML base64 should start with "PHRtbWw" or "PCFET0NUWVBFIGh0bWw"
   - Contract automatically detects HTML base64 and formats it correctly

3. **Gas Costs:**
   - Minting costs gas + 0.0001 ETH
   - On-chain metadata storage increases gas costs
   - Consider using IPFS for metadata in future versions

4. **Security:**
   - Only owner can change mint price and withdraw funds
   - Each FID can only mint one NFT
   - Payment validation ensures correct amount is paid

## Troubleshooting

### Contract Deployment Fails

- Check network configuration
- Verify sufficient ETH balance
- Check contract compilation errors

### Minting Fails

- Verify HTML base64 is correctly formatted
- Check FID hasn't been minted before
- Ensure payment is at least 0.0001 ETH

### Metadata Not Displaying

- Verify `tokenURI()` returns correct metadata
- Check HTML base64 is valid
- Test HTML base64 in browser directly

## Support

For issues or questions, check:
- Contract code: `DEPLOY_CONTRACT.sol`
- Frontend integration: `app/mint/page.tsx`
- API endpoints: `app/api/nft-*/route.ts`

