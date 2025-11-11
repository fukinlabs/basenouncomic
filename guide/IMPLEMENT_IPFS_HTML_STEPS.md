# ขั้นตอนการ Implement: ใช้ IPFS Hash สำหรับ HTML Canvas

## 🎯 เป้าหมาย
ใช้ IPFS Hash แทน HTML Base64 เพื่อประหยัด Gas Cost 93-94% (จาก ~1,500,000 → ~120,000)

---

## ✅ ขั้นตอนที่ต้องทำ (ไม่ต้องแก้โค้ดใหม่)

### 1. **ตั้งค่า Pinata Account**

**สิ่งที่ต้องทำ:**
- ✅ สร้าง Pinata account ที่ [pinata.cloud](https://pinata.cloud)
- ✅ เลือก Free Tier (1 GB storage, 100 requests/day)
- ✅ สร้าง API Key หรือ JWT Token

**วิธีทำ:**
1. ไปที่ Pinata Dashboard → API Keys
2. สร้าง JWT Token (แนะนำ) หรือ API Key + Secret
3. Copy JWT Token หรือ API Key + Secret

---

### 2. **ตั้งค่า Environment Variables ใน Vercel**

**สิ่งที่ต้องทำ:**
- ✅ เพิ่ม Pinata credentials ใน Vercel Environment Variables

**วิธีทำ:**
1. ไปที่ Vercel Dashboard → Project Settings → Environment Variables
2. เพิ่มตัวแปร:
   - `PINATA_JWT` = "your-jwt-token" (ถ้าใช้ JWT)
   - หรือ
   - `PINATA_API_KEY` = "your-api-key"
   - `PINATA_SECRET_API_KEY` = "your-secret-key"
3. เลือก Environment: Production, Preview, Development (ตามต้องการ)
4. Save และ Redeploy

---

### 3. **ตรวจสอบว่า Code พร้อมใช้งาน**

**สิ่งที่ต้องตรวจสอบ:**
- ✅ `app/api/upload-pinata/route.ts` - รองรับ HTML upload
- ✅ `app/api/generate-html-canvas/route.ts` - รองรับ minify parameter
- ✅ `app/mint/page.tsx` - Upload HTML ไป IPFS ก่อน mint

**วิธีตรวจสอบ:**
1. ตรวจสอบว่า API routes มีอยู่
2. ตรวจสอบว่า frontend เรียก API ถูกต้อง
3. Test ใน local environment ก่อน

---

### 4. **Test การ Upload HTML ไป IPFS**

**สิ่งที่ต้องทำ:**
- ✅ Test upload HTML canvas ไป Pinata
- ✅ ตรวจสอบว่าได้ IPFS hash กลับมา
- ✅ ตรวจสอบว่า IPFS hash ถูกต้อง

**วิธีทำ:**
1. เปิด Browser Console
2. Mint NFT
3. ดู Console logs:
   - "Attempting to upload HTML canvas to Pinata IPFS..."
   - "✅ HTML canvas uploaded to IPFS successfully"
   - "Image IPFS hash: Qm..."
4. ตรวจสอบว่า IPFS hash ถูกต้อง (เริ่มด้วย "Qm")

---

### 5. **ตรวจสอบ Gas Cost**

**สิ่งที่ต้องทำ:**
- ✅ ตรวจสอบว่า gas cost ลดลงจริง (~120,000)
- ✅ เปรียบเทียบกับ HTML base64 (~1,500,000-2,000,000)

**วิธีทำ:**
1. Mint NFT
2. ดู Transaction details ใน wallet
3. ตรวจสอบ gas used (ควร ~120,000)
4. เปรียบเทียบกับ HTML base64 (ควรประหยัด 93-94%)

---

### 6. **ตรวจสอบ Basescan Display**

**สิ่งที่ต้องทำ:**
- ✅ ตรวจสอบว่า NFT แสดงใน Basescan ได้
- ✅ ตรวจสอบ metadata ถูกต้อง

**วิธีทำ:**
1. ไปที่ Basescan → NFT Contract → Token ID
2. ตรวจสอบว่า image แสดงได้
3. ตรวจสอบ metadata (name, description, attributes)

---

### 7. **ตรวจสอบ Interactive Display**

**สิ่งที่ต้องทำ:**
- ✅ ตรวจสอบว่า frontend fetch HTML จาก IPFS ได้
- ✅ ตรวจสอบว่า HTML canvas แสดงได้ (interactive)

**วิธีทำ:**
1. ไปที่ NFT view page (`/mint/[tokenId]`)
2. ตรวจสอบว่า HTML canvas แสดงได้
3. ตรวจสอบว่า interactive (ถ้ามี animation)

---

## 📋 Checklist

### Setup
- [ ] สร้าง Pinata account
- [ ] สร้าง JWT Token หรือ API Key
- [ ] เพิ่ม Environment Variables ใน Vercel
- [ ] Redeploy Vercel

### Testing
- [ ] Test upload HTML ไป IPFS
- [ ] ตรวจสอบ IPFS hash ถูกต้อง
- [ ] ตรวจสอบ gas cost (~120,000)
- [ ] ตรวจสอบ Basescan display
- [ ] ตรวจสอบ interactive display

---

## ⚠️ ข้อควรระวัง

### Pinata Free Tier Limits
- **Storage:** 1 GB (รวมทุก files)
- **Requests:** 100 requests/day
- **Maximum mints:** ~50 NFTs/day

### ถ้า Pinata Limit หมด
- Frontend จะ fallback ไป PNG image upload
- หรือใช้ base64 directly (gas cost สูง)

---

## 🎯 สรุป

**สิ่งที่ต้องทำ:**
1. ✅ สร้าง Pinata account
2. ✅ ตั้งค่า Environment Variables ใน Vercel
3. ✅ Redeploy Vercel
4. ✅ Test mint NFT
5. ✅ ตรวจสอบ gas cost และ Basescan display

**ไม่ต้องแก้โค้ด** - Code พร้อมใช้งานแล้ว!

---

## 📝 หมายเหตุ

- Code ปัจจุบันรองรับ HTML upload ไป IPFS แล้ว
- เพียงแค่ตั้งค่า Pinata credentials ใน Vercel
- Frontend จะ upload HTML canvas ไป IPFS อัตโนมัติ
- Gas cost จะลดลง 93-94% (จาก ~1,500,000 → ~120,000)

