# 🔒 Security Checklist - ไฟล์ที่ต้องระวังก่อน Push ขึ้น GitHub

## ✅ ไฟล์ที่ถูก Ignore แล้ว (ปลอดภัย)

ไฟล์เหล่านี้ถูก ignore โดย `.gitignore` แล้ว:
- `.env*` - Environment variables (ยกเว้น `.env.example`)
- `node_modules/` - Dependencies
- `.next/` - Next.js build files
- `.vercel/` - Vercel configuration
- `*.pem` - Private keys
- `*.log` - Log files

## ⚠️ ไฟล์ที่ต้องระวัง

### 1. Environment Variables (`.env` files)
✅ **สถานะ**: ถูก ignore แล้ว
- `.env`
- `.env.local`
- `.env.production`
- `.env.development`

**ตรวจสอบ**: อย่า hardcode secrets ในโค้ด

### 2. API Keys และ Secrets
⚠️ **ต้องระวัง**: 
- `NEXT_PUBLIC_ONCHAINKIT_API_KEY` - ใช้ใน `app/rootProvider.tsx`
  - ✅ ใช้ `process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY` (ปลอดภัย)
  - ⚠️ ต้องตั้งค่าใน Vercel Environment Variables

### 3. Smart Contract Private Keys
✅ **สถานะ**: ไม่มี private keys ในโค้ด
- ใช้ wallet connection (MetaMask, Coinbase Wallet)
- ไม่มี hardcoded private keys

### 4. Configuration Files
✅ **สถานะ**: ปลอดภัย
- `minikit.config.ts` - ใช้ environment variables
- `next.config.js` - ไม่มี sensitive data
- `tailwind.config.js` - ไม่มี sensitive data

## 📋 Checklist ก่อน Push

- [x] ไม่มีไฟล์ `.env` ใน git
- [x] ไม่มี hardcoded API keys
- [x] ไม่มี private keys
- [x] ไม่มี passwords หรือ secrets
- [x] `.gitignore` ตั้งค่าถูกต้อง
- [ ] สร้าง `.env.example` สำหรับ documentation (ถ้าต้องการ)

## 🔐 Environment Variables ที่ต้องตั้งค่าใน Vercel

เมื่อ deploy ขึ้น Vercel ต้องตั้งค่า:

1. **NEXT_PUBLIC_ONCHAINKIT_API_KEY**
   - ใช้สำหรับ OnchainKit
   - ตั้งค่าใน Vercel Dashboard → Settings → Environment Variables

2. **NEXT_PUBLIC_ROOT_URL** (optional)
   - URL ของเว็บไซต์ (เช่น `https://your-app.vercel.app`)
   - ถ้าไม่ตั้ง จะใช้ default `http://localhost:3000`

## 📝 สร้าง .env.example (แนะนำ)

สร้างไฟล์ `.env.example` เพื่อเป็นตัวอย่าง:

```env
# OnchainKit API Key
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_api_key_here

# Root URL (optional)
NEXT_PUBLIC_ROOT_URL=http://localhost:3000
```

## ✅ สรุป

**โค้ดปัจจุบันปลอดภัยแล้ว!** 
- ไม่มี sensitive data ใน git
- ใช้ environment variables ถูกต้อง
- `.gitignore` ตั้งค่าครบถ้วน

**สิ่งที่ต้องทำเมื่อ Deploy:**
1. ตั้งค่า Environment Variables ใน Vercel
2. ตรวจสอบว่า `NEXT_PUBLIC_ONCHAINKIT_API_KEY` ถูกตั้งค่า

