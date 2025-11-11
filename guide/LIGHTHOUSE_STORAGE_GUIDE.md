# Lighthouse Storage Guide (2025)

## 📊 Lighthouse Storage Overview

### Features
- ✅ **Permanent Storage** (pay once, store forever)
- ✅ **Decentralized** (Filecoin + IPFS)
- ✅ **Dedicated IPFS Gateways** (fast retrieval, 4K video streaming)
- ✅ **Encryption & Access Control** (Kavach Threshold Encryption)
- ✅ **Token Gating** (NFTs, tokens, passkeys, zkTLS)
- ✅ **Image Resizing** (decentralized optimization)
- ✅ **Flexible Payments** (annual or lifetime plans)
- ✅ **No Vendor Lock-In** (retrieve & migrate anytime)

---

## 🚀 Setup Steps

### 1. **สร้าง Lighthouse Account**

**สิ่งที่ต้องทำ:**
- ✅ ไปที่ [Lighthouse Storage](https://lighthouse.storage)
- ✅ สร้าง account
- ✅ ได้ API key

**วิธีทำ:**
1. Visit [Lighthouse Storage](https://lighthouse.storage)
2. Sign up for account
3. Get API key from dashboard

---

### 2. **ซื้อ Storage Plan**

**Lighthouse Pricing Plans (2025):**

| Plan | Price | Storage | Bandwidth | IPFS | Filecoin |
|------|-------|---------|-----------|------|----------|
| **Free** | $0/annum | 5 GB | 5 GB | ✅ Yes | ✅ Yes |
| **Lite** | $120/annum | 200 GB | 100 GB | ✅ Yes | ✅ Yes |
| **Premium** | $499/annum | 1 TB | 1 TB | ✅ Yes | ✅ Yes |

**การคำนวณสำหรับ 20,000 NFTs:**
- HTML canvas: ~50-100 KB per file
- 20,000 NFTs = 1-2 GB
- **Free Plan:** 5 GB free storage (เพียงพอสำหรับ 20,000 NFTs)
- **⚠️ หมายเหตุ:** Free Plan มี "Free 14 day trial" และมี warning "Update plan to keep your data" - อาจต้อง upgrade เพื่อเก็บข้อมูลถาวร
- **แนะนำ:** ใช้ **Free Plan** สำหรับทดสอบ ($0/annum, 5 GB) หรือ **Lite Plan** ($120/annum, 200 GB) สำหรับ permanent storage

---

### 3. **ตั้งค่า Environment Variables**

**สิ่งที่ต้องทำ:**
- ✅ เพิ่ม `LIGHTHOUSE_API_KEY` ใน Vercel
- ✅ หรือใช้ใน code โดยตรง

**วิธีทำ:**
1. ไปที่ Vercel Dashboard → Environment Variables
2. เพิ่ม `LIGHTHOUSE_API_KEY` = "your-api-key"
3. Save และ Redeploy

---

### 4. **แก้โค้ดให้ใช้ Lighthouse SDK**

**สิ่งที่ต้องทำ:**
- ✅ Install Lighthouse SDK
- ✅ สร้าง API route ใหม่สำหรับ Lighthouse
- ✅ หรือแก้ `app/api/upload-pinata/route.ts` ให้รองรับ Lighthouse

**ตัวอย่าง Code:**
```typescript
// app/api/upload-lighthouse/route.ts
import { lighthouse } from '@lighthouse-web3/sdk';

const LIGHTHOUSE_API_KEY = process.env.LIGHTHOUSE_API_KEY;

export async function POST(request: NextRequest) {
  const { imageBase64, tokenId, fid } = await request.json();
  
  // Convert base64 to Buffer
  const base64Data = imageBase64.replace(/^data:.*;base64,/, "");
  const buffer = Buffer.from(base64Data, 'base64');
  
  // Upload to Lighthouse
  const uploadResponse = await lighthouse.uploadBuffer(
    buffer,
    LIGHTHOUSE_API_KEY!,
    `nft-${tokenId}.html`
  );
  
  const cid = uploadResponse.data.Hash;
  
  return NextResponse.json({
    ipfsHash: cid,
    ipfsUrl: `ipfs://${cid}`,
  });
}
```

---

## 📊 Comparison: All Storage Providers

| Provider | Storage | Requests | Price | Decentralized | Permanent | 20,000 NFTs |
|----------|---------|----------|-------|---------------|-----------|-------------|
| **Pinata Free** | 1 GB | 100/day | $0/month | ❌ No | ❌ No | ❌ ไม่พอ |
| **Pinata Starter** | 50 GB | Unlimited | $20/month | ❌ No | ❌ No | ✅ เพียงพอ |
| **NFT.Storage** | Pay-as-you-go | Unlimited | $4.99/GB one-time | ✅ Yes | ✅ Yes | ✅ เพียงพอ |
| **Lighthouse** | Pay-as-you-go | Unlimited | Annual/Lifetime | ✅ Yes | ✅ Yes | ✅ เพียงพอ |

---

## 💰 Cost Analysis สำหรับ 20,000 NFTs

### Lighthouse Storage
- **Storage needed:** 1-2 GB
- **Free Plan:** $0/annum, 5 GB storage, 5 GB bandwidth
- **⚠️ หมายเหตุ:** Free Plan มี "Free 14 day trial" และมี warning "Update plan to keep your data"
- **Lite Plan:** $120/annum, 200 GB storage, 100 GB bandwidth (permanent storage)
- **Requests:** Unlimited
- **Gas:** ~120,000 per mint
- **Status:** ✅ **ทำได้ (Free Plan สำหรับทดสอบ, Lite Plan สำหรับ permanent storage)**

### Pinata Starter
- **Storage:** 50 GB ($20/month)
- **Requests:** Unlimited
- **Gas:** ~120,000 per mint
- **Status:** ✅ **ทำได้ (recurring cost)**

### NFT.Storage
- **Storage:** 1-2 GB ($5-10 one-time)
- **Requests:** Unlimited
- **Gas:** ~120,000 per mint
- **Status:** ✅ **ทำได้ (one-time cost)**

---

## 🎯 คำแนะนำ

### สำหรับ 20,000+ NFTs

**Option 1: Pinata Starter** ($20/month) ⭐
- ✅ ง่าย (ไม่ต้องแก้โค้ด)
- ✅ Storage: 50 GB
- ✅ Cost: $20/month (recurring)
- ✅ เหมาะสำหรับ: High volume, ongoing mints

**Option 2: NFT.Storage** ($5-10 one-time) ⭐⭐
- ✅ Decentralized (Filecoin)
- ✅ Long-term preservation
- ✅ Cost: $5-10 one-time
- ✅ เหมาะสำหรับ: Long-term storage, one-time setup
- ⚠️ ต้องแก้โค้ด

**Option 3: Lighthouse** ⭐⭐⭐
- ✅ **Free Plan:** $0/annum, 5 GB storage, 5 GB bandwidth
- ⚠️ **Free Plan:** มี "Free 14 day trial" และ warning "Update plan to keep your data"
- ✅ **Lite Plan:** $120/annum, 200 GB storage, 100 GB bandwidth (permanent storage)
- ✅ Permanent storage (Lite Plan ขึ้นไป)
- ✅ Decentralized (Filecoin + IPFS)
- ✅ Dedicated IPFS gateways (4K video)
- ✅ Encryption & token-gating
- ✅ เหมาะสำหรับ: Free Plan สำหรับทดสอบ, Lite Plan สำหรับ permanent storage
- ⚠️ ต้องแก้โค้ด

**Gas Cost:** ~120,000 per mint (เหมือนกันทุก options)

---

## ✅ สรุป

**สำหรับ 20,000+ NFTs:**

1. **Pinata Starter** ($20/month) - **ง่ายที่สุด**
2. **NFT.Storage** ($5-10 one-time) - **ประหยัดที่สุด**
3. **Lighthouse Free** ($0/annum) - **ฟรีสำหรับทดสอบ** ⭐
4. **Lighthouse Lite** ($120/annum) - **permanent storage** ⭐⭐

**คำแนะนำ:**
- **ถ้า mint ต่อเนื่อง:** ใช้ Pinata Starter ($20/month)
- **ถ้า mint ครั้งเดียว:** ใช้ NFT.Storage ($5-10 one-time) - **ประหยัดที่สุด**
- **ถ้าต้องการทดสอบฟรี:** ใช้ Lighthouse Free ($0/annum, 14 day trial)
- **ถ้าต้องการ permanent storage:** ใช้ Lighthouse Lite ($120/annum) - **permanent storage**

**Reference:** [Lighthouse Documentation](https://docs.lighthouse.storage/lighthouse-1/)

