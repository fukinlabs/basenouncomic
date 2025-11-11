# สรุป: Smart Contract ที่ควรใช้

## 📊 Smart Contracts ที่มีอยู่

### 1. `DEPLOY_CONTRACT.sol` (Contract เดิม)
- **Contract Name:** `BasegenerateOnchainNFT`
- **Symbol:** `FP5`
- **Features:**
  - ✅ รองรับ IPFS Hash
  - ✅ รองรับ HTML Base64
  - ✅ รองรับ JPEG Base64
  - ✅ รองรับ PNG Base64 (default)
  - ❌ ไม่รองรับ WebP Base64
  - ❌ ไม่มี Supply Limit

**Status:** ⚠️ **ไม่แนะนำ** (ไม่มี WebP support และ supply limit)

---

### 2. `DEPLOY_CONTRACT_NEW.sol` (Contract ใหม่ - **แนะนำ**) ⭐
- **Contract Name:** `BasegenonetestOnchainNFT`
- **Symbol:** `BT5`
- **Features:**
  - ✅ รองรับ IPFS Hash
  - ✅ รองรับ HTML Base64
  - ✅ รองรับ JPEG Base64
  - ✅ **รองรับ WebP Base64** ⭐ NEW
  - ✅ รองรับ PNG Base64 (default)
  - ✅ **Supply Limit: 12,345** ⭐ NEW
  - ✅ `totalSupply()` function
  - ✅ `remainingSupply()` function

**Status:** ✅ **แนะนำที่สุด** (รองรับ WebP + Supply Limit)

---

### 3. `DEPLOY_CONTRACT_WEBP.sol` (Contract สำหรับ WebP)
- **Contract Name:** `WebPArtNFT`
- **Symbol:** `WEBP`
- **Features:**
  - ✅ รองรับ IPFS Hash
  - ✅ รองรับ HTML Base64
  - ✅ รองรับ JPEG Base64
  - ✅ รองรับ WebP Base64
  - ✅ รองรับ PNG Base64 (default)
  - ✅ Supply Limit: 12,345
  - ✅ `totalSupply()` function
  - ✅ `remainingSupply()` function

**Status:** ✅ **ใช้ได้** (เหมือน DEPLOY_CONTRACT_NEW.sol แต่ชื่อต่างกัน)

---

## 🎯 คำแนะนำ: ใช้ Contract ไหน?

### ✅ **แนะนำ: `DEPLOY_CONTRACT_NEW.sol`** ⭐

**เหตุผล:**
1. ✅ **รองรับ WebP Base64** (ประหยัด gas ~30-50 KB)
2. ✅ **Supply Limit: 12,345** (ควบคุมจำนวน NFTs)
3. ✅ **Helper Functions:** `totalSupply()`, `remainingSupply()`
4. ✅ **Multi-Format Support:** IPFS, HTML, JPEG, WebP, PNG
5. ✅ **Compatible** กับ frontend code ปัจจุบัน

---

## 📊 เปรียบเทียบ Contracts

| Feature | DEPLOY_CONTRACT.sol | DEPLOY_CONTRACT_NEW.sol | DEPLOY_CONTRACT_WEBP.sol |
|---------|---------------------|------------------------|--------------------------|
| **IPFS Hash** | ✅ Yes | ✅ Yes | ✅ Yes |
| **HTML Base64** | ✅ Yes | ✅ Yes | ✅ Yes |
| **JPEG Base64** | ✅ Yes | ✅ Yes | ✅ Yes |
| **PNG Base64** | ✅ Yes | ✅ Yes | ✅ Yes |
| **WebP Base64** | ❌ No | ✅ Yes | ✅ Yes |
| **Supply Limit** | ❌ No | ✅ 12,345 | ✅ 12,345 |
| **totalSupply()** | ❌ No | ✅ Yes | ✅ Yes |
| **remainingSupply()** | ❌ No | ✅ Yes | ✅ Yes |
| **Status** | ⚠️ Old | ✅ **แนะนำ** | ✅ Alternative |

---

## 🔧 การใช้งาน

### 1. Deploy Contract

```bash
# ใช้ DEPLOY_CONTRACT_NEW.sol
npx hardhat compile
npx hardhat run scripts/deploy.js --network base
```

### 2. Initialize Contract

```typescript
await contract.initialize(ownerAddress);
```

### 3. Update Frontend

```typescript
// app/mint/page.tsx
const NFT_CONTRACT_ADDRESS = "0x..."; // New contract address

// Update ABI (ถ้าต้องการ)
import contractAbi from '@/lib/contract-abi.json';
```

---

## 📝 Contract Details

### DEPLOY_CONTRACT_NEW.sol

**Contract Name:** `BasegenonetestOnchainNFT`  
**Symbol:** `BT5`  
**Max Supply:** 12,345  
**Supported Formats:**
- ✅ IPFS Hash (`ipfs://...`)
- ✅ HTML Base64 (`data:text/html;base64,...`)
- ✅ JPEG Base64 (`data:image/jpeg;base64,...`)
- ✅ **WebP Base64** (`data:image/webp;base64,...`) ⭐
- ✅ PNG Base64 (`data:image/png;base64,...`)

**Functions:**
- `mintForFid(address to, uint256 fid, string memory imageBase64)`
- `totalSupply()` → returns current supply
- `remainingSupply()` → returns remaining supply
- `mintedFid(uint256 fid)` → check if FID already minted

---

## ✅ สรุป

### ใช้ Contract ไหน?

**คำตอบ: `DEPLOY_CONTRACT_NEW.sol`** ⭐

**เหตุผล:**
1. ✅ รองรับ WebP Base64 (ประหยัด gas)
2. ✅ Supply Limit: 12,345 (ควบคุมจำนวน)
3. ✅ Helper functions สำหรับตรวจสอบ supply
4. ✅ Compatible กับ frontend code ปัจจุบัน

**File:** `DEPLOY_CONTRACT_NEW.sol`

---

## 🔗 Next Steps

1. ✅ Deploy `DEPLOY_CONTRACT_NEW.sol`
2. ✅ Initialize contract
3. ✅ Update `NFT_CONTRACT_ADDRESS` ใน frontend
4. ✅ Test minting with WebP base64
5. ✅ Verify supply limit works

