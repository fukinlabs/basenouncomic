# Pinata Free Tier Limits

## 📊 Pinata Free Tier (Community Plan)

### Storage
- **1 GB** total storage
- Unlimited files (within storage limit)

### Bandwidth
- **100 requests/day** (API calls)
- Gateway requests count toward limit

### Features
- ✅ IPFS pinning
- ✅ File upload API
- ✅ Gateway access
- ✅ Metadata API
- ❌ No dedicated gateway
- ❌ No advanced analytics

---

## 💰 Pricing Comparison

| Plan | Storage | Requests/Day | Price |
|------|---------|--------------|-------|
| **Free** | 1 GB | 100 | $0/month |
| **Starter** | 50 GB | Unlimited | $20/month |
| **Pro** | 500 GB | Unlimited | $200/month |

---

## ⚠️ ข้อจำกัดของ Free Tier

### 1. Storage Limit (1 GB)
- **NFT Image (PNG):** ~50-200 KB per file
- **NFT Metadata (JSON):** ~1-5 KB per file
- **Total per NFT:** ~51-205 KB
- **Maximum NFTs:** ~4,800-19,600 NFTs (within 1 GB)

### 2. Request Limit (100/day)
- **Upload per mint:** 2 requests (image + metadata)
- **Maximum mints/day:** ~50 NFTs/day
- **Gateway requests:** Count toward limit

---

## 🎯 คำแนะนำสำหรับ Free Tier

### 1. ใช้ IPFS Hash (แนะนำ)
```typescript
// Gas cost: ~120,000 gas (ต่ำสุด)
// Basescan: 100% success
imageData = `ipfs://${ipfsHash}`;
```

**ข้อดี:**
- ✅ Gas cost ต่ำสุด (~120,000 gas)
- ✅ Basescan แสดงได้ 100%
- ✅ Storage: ~50-200 KB per NFT
- ✅ Requests: 2 requests per mint

**ข้อจำกัด:**
- ⚠️ Free tier: 100 requests/day (~50 mints/day)
- ⚠️ Free tier: 1 GB storage (~4,800-19,600 NFTs)

---

### 2. ใช้ PNG Base64 (Fallback)
```typescript
// Gas cost: ~200,000-300,000 gas
// Basescan: 100% success
imageData = imageBase64Only; // PNG base64
```

**ข้อดี:**
- ✅ Basescan แสดงได้ 100%
- ✅ ไม่ใช้ Pinata (unlimited mints)
- ✅ Gas cost ปานกลาง (~200,000-300,000)

**ข้อจำกัด:**
- ⚠️ Gas cost สูงกว่า IPFS (~2-3x)
- ⚠️ Contract storage สูง (on-chain)

---

### 3. ใช้ HTML Base64 (ไม่แนะนำ)
```typescript
// Gas cost: ~1,500,000-2,000,000 gas
// Basescan: 0% success
imageData = htmlBase64; // HTML base64
```

**ข้อดี:**
- ✅ Interactive canvas (frontend only)
- ✅ ไม่ใช้ Pinata

**ข้อจำกัด:**
- ❌ Gas cost สูงมาก (~15-20x IPFS)
- ❌ Basescan ไม่แสดง (0% success)
- ❌ Contract storage สูงมาก (on-chain)

---

## 📈 การใช้งาน Free Tier

### Scenario 1: Low Volume (< 50 mints/day)
- ✅ **ใช้ IPFS Hash** (แนะนำ)
- Gas: ~120,000 per mint
- Storage: ~50-200 KB per NFT
- Requests: 2 per mint
- **Result:** ทำงานได้ดีใน free tier

### Scenario 2: High Volume (> 50 mints/day)
- ⚠️ **ใช้ PNG Base64** (fallback)
- Gas: ~200,000-300,000 per mint
- Storage: On-chain (ไม่ใช้ Pinata)
- Requests: 0 per mint
- **Result:** ทำงานได้แต่ gas cost สูงกว่า

### Scenario 3: Very High Volume (> 100 mints/day)
- 💰 **Upgrade to Starter Plan** ($20/month)
- Storage: 50 GB (unlimited)
- Requests: Unlimited
- **Result:** ทำงานได้ดีที่สุด

---

## 🎯 สรุป

### สำหรับ Free Tier (1 GB, 100 requests/day)

**แนะนำ:**
1. **ใช้ IPFS Hash** (gas: ~120,000, Basescan: 100%)
   - ทำงานได้ดีสำหรับ < 50 mints/day
   - Storage: ~4,800-19,600 NFTs (within 1 GB)

2. **Fallback: PNG Base64** (gas: ~200,000-300,000, Basescan: 100%)
   - ใช้เมื่อ Pinata limit หมด
   - ไม่ใช้ Pinata (unlimited mints)

**ไม่แนะนำ:**
- ❌ HTML Base64 (gas: ~1,500,000-2,000,000, Basescan: 0%)

---

## 📝 หมายเหตุ

- Pinata free tier limits อาจเปลี่ยนแปลงได้
- ตรวจสอบ [Pinata Pricing](https://www.pinata.cloud/pricing) สำหรับข้อมูลล่าสุด
- Gateway requests count toward daily limit
- Storage limit รวมทุก files (image + metadata)

