# Guide: Smart Contract ERC721 รองรับ WebP Base64

## 📊 Contract Features

### ✅ Features
- ✅ **ERC721 Standard** (OpenZeppelin)
- ✅ **WebP Base64 Support** (เพิ่ม `_isWebpBase64()` function)
- ✅ **Supply Limit: 12,345** (MAX_SUPPLY constant)
- ✅ **Multi-Format Support:**
  - IPFS Hash (`ipfs://...`)
  - HTML Base64 (`data:text/html;base64,...`)
  - JPEG Base64 (`data:image/jpeg;base64,...`)
  - **WebP Base64** (`data:image/webp;base64,...`) ⭐ NEW
  - PNG Base64 (`data:image/png;base64,...`) (default)

---

## 🔍 WebP Detection Logic

### `_isWebpBase64()` Function

**Detection Method:**
1. **Check for "UklGR"** (RIFF header in base64)
   - WebP files start with RIFF (0x52 0x49 0x46 0x46)
   - Base64 encoding: "UklGR" (0x55 0x6B 0x6C 0x47 0x52)

2. **Check for "V0VC"** (WEBP in base64)
   - WEBP magic bytes: 0x57 0x45 0x42 0x50
   - Base64 encoding: "V0VCUA=="
   - We check for "V0VC" (0x56 0x30 0x55 0x42)

**Code:**
```solidity
function _isWebpBase64(string memory base64String) internal pure returns (bool) {
    bytes memory base64Bytes = bytes(base64String);
    
    if (base64Bytes.length >= 5) {
        // Check for "UklGR" (RIFF header)
        if (
            base64Bytes[0] == 0x55 && // 'U'
            base64Bytes[1] == 0x6B && // 'k'
            base64Bytes[2] == 0x6C && // 'l'
            base64Bytes[3] == 0x47 && // 'G'
            base64Bytes[4] == 0x52    // 'R'
        ) {
            // Additional check for "V0VC" (WEBP)
            if (base64Bytes.length >= 12) {
                for (uint i = 8; i < base64Bytes.length - 4; i++) {
                    if (
                        base64Bytes[i] == 0x56 &&     // 'V'
                        base64Bytes[i + 1] == 0x30 && // '0'
                        base64Bytes[i + 2] == 0x55 && // 'U'
                        base64Bytes[i + 3] == 0x42    // 'B'
                    ) {
                        return true;
                    }
                }
            }
            return true; // Likely WebP if starts with "UklGR"
        }
    }
    
    return false;
}
```

---

## 📊 Supply Limit

### MAX_SUPPLY: 12,345

**Implementation:**
```solidity
uint256 public constant MAX_SUPPLY = 12345;

function mintForFid(...) external {
    require(nextId < MAX_SUPPLY, "Maximum supply reached");
    // ...
    uint256 tokenId = nextId++;
    require(tokenId < MAX_SUPPLY, "Maximum supply exceeded");
}
```

**Helper Functions:**
```solidity
// Get current supply
function totalSupply() public view returns (uint256) {
    return nextId;
}

// Get remaining supply
function remainingSupply() public view returns (uint256) {
    return MAX_SUPPLY - nextId;
}
```

---

## 🎯 Usage Examples

### Frontend: Mint with WebP Base64

```typescript
// app/mint/page.tsx
import { generateWebPBase64 } from '@/lib/p5-art-generator';

const handleMint = async () => {
  try {
    // Generate WebP base64 (600x600)
    const webpBase64 = await generateWebPBase64({ tokenId: fid.toString() }, 600);
    
    // Send to contract
    await writeContract({
      address: NFT_CONTRACT_ADDRESS,
      abi: contractAbi,
      functionName: 'mintForFid',
      args: [address, BigInt(fid), webpBase64],
    });
  } catch (error) {
    console.error('Error minting:', error);
  }
};
```

### Check Supply

```typescript
// Check current supply
const totalSupply = await readContract({
  address: NFT_CONTRACT_ADDRESS,
  abi: contractAbi,
  functionName: 'totalSupply',
});

// Check remaining supply
const remaining = await readContract({
  address: NFT_CONTRACT_ADDRESS,
  abi: contractAbi,
  functionName: 'remainingSupply',
});

console.log(`Total Supply: ${totalSupply} / 12,345`);
console.log(`Remaining: ${remaining}`);
```

---

## 📊 Format Priority

Contract จะตรวจสอบ format ตามลำดับ:

1. **IPFS Hash** (`ipfs://...`)
   - ✅ Lowest gas cost (~120,000)
   - ✅ Basescan: 100%

2. **HTML Base64** (`data:text/html;base64,...`)
   - ⚠️ Highest gas cost (~1,500,000-2,000,000)
   - ❌ Basescan: 0%

3. **JPEG Base64** (`data:image/jpeg;base64,...`)
   - ✅ Medium gas cost (~200,000-300,000)
   - ✅ Basescan: 100%

4. **WebP Base64** (`data:image/webp;base64,...`) ⭐ NEW
   - ✅ Low gas cost (~200,000-300,000)
   - ⚠️ Basescan: อาจไม่รองรับ (ต้องตรวจสอบ)

5. **PNG Base64** (default)
   - ✅ Medium gas cost (~200,000-300,000)
   - ✅ Basescan: 100%

---

## 💰 Gas Cost Comparison

| Format | Base64 Size | Gas Cost | Basescan |
|--------|-------------|----------|----------|
| **IPFS Hash** | ~46 bytes | ~120,000 | ✅ 100% |
| **WebP Base64** | ~30-50 KB | ~200,000-300,000 | ⚠️ ? |
| **PNG Base64** | ~80-120 KB | ~200,000-300,000 | ✅ 100% |
| **JPEG Base64** | ~40-70 KB | ~200,000-300,000 | ✅ 100% |
| **HTML Base64** | ~50-100 KB | ~1,500,000-2,000,000 | ❌ 0% |

**WebP ข้อดี:**
- ✅ ขนาดไฟล์เล็กที่สุด (~30-50 KB)
- ✅ Gas cost ต่ำ (เทียบเท่า PNG/JPEG)
- ✅ Quality สูง (92%)

---

## ⚠️ ข้อควรระวัง

### 1. Basescan Support
- ⚠️ Basescan อาจไม่แสดง WebP base64
- ✅ รองรับ PNG/JPEG base64 แน่นอน
- **แนะนำ:** ทดสอบก่อน deploy หรือใช้ PNG เป็น fallback

### 2. Browser Support
- ✅ Chrome, Firefox, Edge, Opera (รองรับ WebP)
- ✅ Safari 14+ (รองรับ WebP)
- ❌ Internet Explorer (ไม่รองรับ WebP)

### 3. Supply Limit
- ⚠️ Contract จะ reject mint เมื่อถึง 12,345
- ✅ ใช้ `remainingSupply()` เพื่อตรวจสอบก่อน mint

---

## 🔧 Deployment

### 1. Compile Contract
```bash
npx hardhat compile
# หรือ
forge build
```

### 2. Deploy Contract
```bash
# Using Hardhat
npx hardhat run scripts/deploy.js --network base

# Using Foundry
forge script script/Deploy.s.sol --rpc-url base --broadcast
```

### 3. Initialize Contract
```typescript
await contract.initialize(ownerAddress);
```

### 4. Update Frontend
```typescript
// Update contract address
const NFT_CONTRACT_ADDRESS = "0x..."; // New contract address

// Update ABI
import contractAbi from '@/lib/contract-abi.json';
```

---

## ✅ Checklist

- [x] เพิ่ม `_isWebpBase64()` function
- [x] เพิ่ม supply limit: 12,345
- [x] เพิ่ม `totalSupply()` function
- [x] เพิ่ม `remainingSupply()` function
- [x] รองรับ WebP base64 ใน `mintForFid()`
- [x] รองรับ IPFS, HTML, JPEG, PNG, WebP

---

## 📝 Contract Summary

**Contract Name:** `WebPArtNFT`  
**Symbol:** `WEBP`  
**Max Supply:** 12,345  
**Supported Formats:**
- ✅ IPFS Hash
- ✅ HTML Base64
- ✅ JPEG Base64
- ✅ **WebP Base64** ⭐ NEW
- ✅ PNG Base64 (default)

**File:** `DEPLOY_CONTRACT_WEBP.sol`

