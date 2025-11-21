# วิธีตรวจสอบว่า NFT ที่ Mint ไปแล้วใช้ Pinata หรือไม่

## 📋 Contract Address
```
0x612b7Cf11090C01634714FdF27b3F943BE7D3B2C
```

## 🔍 วิธีที่ 1: ดู Console Logs (ถ้ายังเปิดอยู่)

ถ้าคุณยังเปิด Browser Console อยู่ตอน mint:

### ✅ **ถ้าใช้ Pinata (IPFS):**
คุณจะเห็น logs เหล่านี้:
```
Image uploaded to IPFS: https://gateway.pinata.cloud/ipfs/Qm...
Image IPFS hash: Qm...
Using IPFS hash for minting (lowest gas cost: ~120,000 gas, Basescan compatible: 100%)
```

### ❌ **ถ้าใช้ Base64 (Fallback):**
คุณจะเห็น logs เหล่านี้:
```
Pinata not configured, using base64 directly (not recommended for production)
IPFS not available, using compressed base64 (fallback)
Using compressed base64 (gas: ~400,000-500,000, still much lower than original)
```

---

## 🔍 วิธีที่ 2: ดู Gas Cost ใน Basescan (แนะนำ)

### ขั้นตอน:
1. ไปที่ **Basescan**: https://basescan.org
2. ใส่ **Transaction Hash** ที่ได้ตอน mint
   - Transaction hash จะแสดงในหน้า mint หลัง mint สำเร็จ
   - หรือดูใน wallet transaction history
3. ดู **Gas Used**:

### ✅ **ถ้าใช้ Pinata (IPFS):**
- **Gas Used**: ~**120,000 - 150,000**
- **Gas Cost**: ~**$0.01 - $0.02** (ขึ้นอยู่กับ gas price)

### ❌ **ถ้าใช้ Base64:**
- **Gas Used**: ~**400,000 - 500,000**
- **Gas Cost**: ~**$0.04 - $0.05** (ขึ้นอยู่กับ gas price)

**สรุป:** ถ้า Gas Used น้อยกว่า 200,000 = ใช้ Pinata ✅

---

## 🔍 วิธีที่ 3: ดู Metadata ใน Basescan

### ขั้นตอน:
1. ไปที่ **Basescan**: https://basescan.org
2. ไปที่ Contract: `0x612b7Cf11090C01634714FdF27b3F943BE7D3B2C`
3. คลิก **"Read Contract"** → **"tokenURI"**
4. ใส่ **Token ID** ที่ mint ได้
5. ดูผลลัพธ์ (base64 JSON)
6. Decode base64 JSON (ใช้ https://base64decode.org)
7. ดู field `"image"`:

### ✅ **ถ้าใช้ Pinata (IPFS):**
```json
{
  "image": "ipfs://QmXxxx..."
}
```
หรือ
```json
{
  "image": "https://gateway.pinata.cloud/ipfs/QmXxxx..."
}
```

### ❌ **ถ้าใช้ Base64:**
```json
{
  "image": "data:image/png;base64,iVBORw0KG..."
}
```
หรือ
```json
{
  "image": "data:text/html;base64,PHRtbWw+..."
}
```

---

## 🔍 วิธีที่ 4: ใช้ API Endpoint

### ตรวจสอบ Metadata:
```
https://farcasterabstact.wtf/api/nft-metadata?tokenId=YOUR_TOKEN_ID
```

### ดูผลลัพธ์:
- ถ้า `image` field เริ่มด้วย `ipfs://` หรือ `https://gateway.pinata.cloud` = **ใช้ Pinata** ✅
- ถ้า `image` field เริ่มด้วย `data:image/` หรือ `data:text/html` = **ใช้ Base64** ❌

---

## 🔍 วิธีที่ 5: ดูใน Basescan NFT Explorer

### ขั้นตอน:
1. ไปที่: https://basescan.org/token/0x612b7Cf11090C01634714FdF27b3F943BE7D3B2C
2. ใส่ **Token ID** ในช่องค้นหา
3. ดู **Image Display**:

### ✅ **ถ้าใช้ Pinata:**
- ภาพจะแสดงใน Basescan ได้ 100%
- ภาพจะมาจาก `gateway.pinata.cloud` หรือ IPFS gateway

### ❌ **ถ้าใช้ Base64:**
- ถ้าเป็น PNG/JPEG base64 → ภาพจะแสดงได้
- ถ้าเป็น HTML base64 → ภาพจะไม่แสดง (0% success)

---

## 📊 สรุปเปรียบเทียบ

| วิธีตรวจสอบ | Pinata (IPFS) | Base64 |
|------------|---------------|--------|
| **Gas Used** | ~120,000 | ~400,000-500,000 |
| **Gas Cost** | ~$0.01-0.02 | ~$0.04-0.05 |
| **Image Format** | `ipfs://Qm...` | `data:image/...` |
| **Basescan Display** | ✅ 100% | ⚠️ ขึ้นอยู่กับ format |
| **Console Log** | "Image uploaded to IPFS" | "using base64 directly" |

---

## 🎯 วิธีที่เร็วที่สุด

**ดู Gas Cost ใน Basescan:**
- ถ้า Gas Used < 200,000 = **ใช้ Pinata** ✅
- ถ้า Gas Used > 300,000 = **ใช้ Base64** ❌

---

## ❓ ถ้ายังไม่แน่ใจ

ลองใช้ API endpoint:
```
https://farcasterabstact.wtf/api/nft-metadata?tokenId=YOUR_TOKEN_ID
```

ดู field `image` ใน response:
- `ipfs://` หรือ `gateway.pinata.cloud` = **Pinata** ✅
- `data:image/` หรือ `data:text/html` = **Base64** ❌

