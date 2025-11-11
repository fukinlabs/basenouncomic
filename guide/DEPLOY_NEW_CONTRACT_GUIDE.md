# Deploy New Contract Guide

## ⚠️ ปัญหาใน Contract ที่ให้มา

### Contract Code ที่ให้มา (ยังไม่ถูกต้อง)

```solidity
// Line 39 - ❌ ผิด!
} else if (isHtmlBase64) {
    imageDataUri = string(abi.encodePacked("data:image/png;base64,", imageBase64));
}
```

**ปัญหา:**
- Contract ตรวจพบ HTML base64
- แต่เก็บเป็น `data:image/png;base64,{htmlBase64}` (label ผิด!)
- ควรเป็น `data:text/html;base64,{htmlBase64}`

---

## ✅ Contract ที่แก้ไขแล้ว

### ไฟล์: `DEPLOY_CONTRACT_NEW.sol`

```solidity
// Line 39 - ✅ ถูกต้อง!
} else if (isHtmlBase64) {
    // เก็บ HTML base64 อย่างถูกต้อง
    imageDataUri = string(abi.encodePacked("data:text/html;base64,", imageBase64));
}
```

**การเปลี่ยนแปลง:**
- ✅ Contract name: `BasegenonetestOnchainNFT`
- ✅ Token name: `"BasttestNFT"`
- ✅ Token symbol: `"BT5"`
- ✅ HTML base64: เก็บอย่างถูกต้อง (`data:text/html;base64,`)

---

## 🎯 ควร Deploy ใหม่หรือไม่?

### ✅ **ควร Deploy ใหม่** ถ้า:

1. **ยังไม่ได้ Deploy Contract ครั้งแรก**
   - Deploy contract ที่แก้ไขแล้ว (`DEPLOY_CONTRACT_NEW.sol`)
   - ใช้ contract ที่ถูกต้องตั้งแต่เริ่มต้น

2. **Contract ยังไม่ได้ Deploy หรือ Deploy ไม่สำเร็จ**
   - Deploy contract ใหม่ที่แก้ไขแล้ว
   - ไม่มี NFT ที่ mint แล้ว (ไม่มีปัญหา migration)

3. **ต้องการใช้ HTML Base64**
   - Contract ใหม่จะเก็บ HTML base64 อย่างถูกต้อง
   - Metadata จะเป็น `data:text/html;base64,{htmlBase64}`

---

### ❌ **ไม่ควร Deploy ใหม่** ถ้า:

1. **Contract Deploy แล้วและมี NFT ที่ mint แล้ว**
   - Contract ที่ deploy แล้วจะไม่สามารถแก้ไขได้ (immutable)
   - NFT ที่ mint แล้วจะใช้ metadata เก่า
   - ต้อง deploy contract ใหม่ (address ใหม่)

2. **ใช้ IPFS Hash หรือ PNG Base64 เท่านั้น**
   - Contract เก่ายังทำงานได้ดี
   - ไม่จำเป็นต้องแก้ไข HTML base64

---

## 📊 Comparison

| Feature | Contract เก่า | Contract ใหม่ |
|---------|---------------|--------------|
| **IPFS Hash** | ✅ ถูกต้อง | ✅ ถูกต้อง |
| **PNG Base64** | ✅ ถูกต้อง | ✅ ถูกต้อง |
| **HTML Base64** | ❌ ผิด (PNG label) | ✅ ถูกต้อง (HTML label) |
| **Contract Name** | `BasegenerateOnchainNFT` | `BasegenonetestOnchainNFT` |
| **Token Name** | `"FarcasterP5NFT"` | `"BasttestNFT"` |
| **Token Symbol** | `"FP5"` | `"BT5"` |

---

## 🚀 Deploy Steps

### Step 1: ใช้ Contract ที่แก้ไขแล้ว

```bash
# ใช้ไฟล์: DEPLOY_CONTRACT_NEW.sol
# Contract name: BasegenonetestOnchainNFT
# Token name: "BasttestNFT"
# Token symbol: "BT5"
```

### Step 2: Deploy Contract

```bash
# Deploy ผ่าน Remix, Hardhat, หรือ Foundry
# ใช้ DEPLOY_CONTRACT_NEW.sol
```

### Step 3: Update Frontend

```typescript
// app/mint/page.tsx หรือไฟล์ที่เก็บ contract address
const NFT_CONTRACT_ADDRESS = "0x..."; // Address ใหม่
```

### Step 4: Update ABI (ถ้าจำเป็น)

```bash
# ถ้า contract มีการเปลี่ยนแปลง ABI
# Update lib/contract-abi.json
```

---

## ✅ สรุป

### ควร Deploy ใหม่ ถ้า:
- ✅ ยังไม่ได้ deploy contract ครั้งแรก
- ✅ ต้องการใช้ HTML base64 อย่างถูกต้อง
- ✅ ต้องการใช้ contract name/symbol ใหม่

### ไม่ควร Deploy ใหม่ ถ้า:
- ❌ Contract deploy แล้วและมี NFT ที่ mint แล้ว
- ❌ ใช้ IPFS hash หรือ PNG base64 เท่านั้น

---

## 📝 หมายเหตุ

- Contract ที่ deploy แล้วจะไม่สามารถแก้ไขได้ (immutable)
- NFT ที่ mint แล้วจะใช้ metadata ตาม contract ที่ mint
- Contract ใหม่จะมี address ใหม่ (ต้อง update frontend)

