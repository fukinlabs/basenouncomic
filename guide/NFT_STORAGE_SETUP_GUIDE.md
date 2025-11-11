# NFT.Storage Setup Guide (2025)

## 📊 NFT.Storage Overview

### Features
- ✅ **Decentralized Storage** (Filecoin Network)
- ✅ **Long-term Preservation** (on-chain endowment)
- ✅ **Pay-as-you-go** (ซื้อ storage ตามต้องการ)
- ✅ **Unlimited Requests** (ไม่มี limit)
- ✅ **One-time Fee** (ไม่ใช่ recurring cost)

---

## 🚀 Setup Steps

### 1. **สร้าง NFT.Storage Account**

**สิ่งที่ต้องทำ:**
- ✅ ไปที่ [NFT.Storage](https://app.nft.storage)
- ✅ Click "Log in with GitHub"
- ✅ Authorize NFT.Storage
- ✅ ได้ account และ dashboard

**วิธีทำ:**
1. Visit [NFT.Storage website](https://app.nft.storage)
2. Click "Log in with GitHub"
3. Authorize NFT.Storage
4. Redirect กลับ NFT.Storage dashboard

---

### 2. **ซื้อ Storage**

**สิ่งที่ต้องทำ:**
- ✅ ไปที่ Dashboard → "Get more storage"
- ✅ ใส่จำนวน storage ที่ต้องการ
- ✅ Click "Pay Now"
- ✅ Complete payment

**การคำนวณสำหรับ 20,000 NFTs:**
- HTML canvas: ~50-100 KB per file
- 20,000 NFTs = 1-2 GB
- **แนะนำ:** ซื้อ 2-3 GB (เผื่อไว้)

---

### 3. **ได้ API Token**

**สิ่งที่ต้องทำ:**
- ✅ ไปที่ Dashboard → API Keys
- ✅ สร้าง API token
- ✅ Copy token (เก็บไว้ปลอดภัย)

---

### 4. **ตั้งค่า Environment Variables**

**สิ่งที่ต้องทำ:**
- ✅ เพิ่ม `NFT_STORAGE_API_KEY` ใน Vercel
- ✅ หรือใช้ใน code โดยตรง

**วิธีทำ:**
1. ไปที่ Vercel Dashboard → Environment Variables
2. เพิ่ม `NFT_STORAGE_API_KEY` = "your-api-token"
3. Save และ Redeploy

---

### 5. **แก้โค้ดให้ใช้ NFT.Storage API**

**สิ่งที่ต้องทำ:**
- ✅ สร้าง API route ใหม่สำหรับ NFT.Storage
- ✅ หรือแก้ `app/api/upload-pinata/route.ts` ให้รองรับ NFT.Storage

**ตัวอย่าง Code:**
```typescript
// app/api/upload-nft-storage/route.ts
import { NFTStorage, File } from 'nft.storage';

const NFT_STORAGE_API_KEY = process.env.NFT_STORAGE_API_KEY;

export async function POST(request: NextRequest) {
  const { imageBase64, tokenId, fid } = await request.json();
  
  // Convert base64 to Buffer
  const base64Data = imageBase64.replace(/^data:.*;base64,/, "");
  const buffer = Buffer.from(base64Data, 'base64');
  
  // Create NFT.Storage client
  const client = new NFTStorage({ token: NFT_STORAGE_API_KEY! });
  
  // Upload to NFT.Storage
  const file = new File([buffer], `nft-${tokenId}.html`, { type: 'text/html' });
  const cid = await client.storeBlob(file);
  
  return NextResponse.json({
    ipfsHash: cid,
    ipfsUrl: `ipfs://${cid}`,
  });
}
```

---

## 📊 Comparison: Pinata vs NFT.Storage

| Feature | Pinata Free | Pinata Starter | NFT.Storage |
|---------|-------------|----------------|-------------|
| **Storage** | 1 GB | 50 GB | Pay-as-you-go |
| **Requests** | 100/day | Unlimited | Unlimited |
| **Cost** | $0/month | $20/month | Pay per GB |
| **Decentralized** | ❌ No | ❌ No | ✅ Yes (Filecoin) |
| **Long-term** | ❌ No | ❌ No | ✅ Yes (endowment) |
| **20,000 NFTs** | ❌ ไม่พอ | ✅ เพียงพอ | ✅ เพียงพอ |

---

## 💰 Cost Analysis สำหรับ 20,000 NFTs

### NFT.Storage
- **Storage needed:** 1-2 GB
- **Cost:** Pay per GB (check current pricing)
- **Requests:** Unlimited
- **Gas:** ~120,000 per mint
- **Status:** ✅ **ทำได้**

### Pinata Starter
- **Storage:** 50 GB ($20/month)
- **Requests:** Unlimited
- **Gas:** ~120,000 per mint
- **Status:** ✅ **ทำได้**

---

## 🎯 คำแนะนำ

### สำหรับ 20,000+ NFTs

**Option 1: Pinata Starter** ($20/month) ⭐
- ✅ ง่าย (ไม่ต้องแก้โค้ด)
- ✅ Storage เพียงพอ (50 GB)
- ✅ Unlimited requests
- ✅ Cost: $20/month

**Option 2: NFT.Storage** (Pay-as-you-go) ⭐
- ✅ Decentralized (Filecoin)
- ✅ Long-term preservation
- ✅ Unlimited requests
- ⚠️ ต้องแก้โค้ด
- ⚠️ ต้องซื้อ storage ก่อน

---

## ✅ สรุป

**สำหรับ 20,000+ NFTs:**

1. **Pinata Starter** ($20/month) - **แนะนำ**
   - ง่าย (ไม่ต้องแก้โค้ด)
   - Storage: 50 GB
   - Cost: $20/month

2. **NFT.Storage** (Pay-as-you-go)
   - Decentralized
   - Long-term preservation
   - ⚠️ ต้องแก้โค้ด
   - ⚠️ ต้องซื้อ storage

**Gas Cost:** ~120,000 per mint (เหมือนกันทั้ง 2 options)

