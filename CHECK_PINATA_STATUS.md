# วิธีตรวจสอบว่า Pinata ซิงค์กับ Vercel แล้วหรือยัง

## วิธีที่ 1: ใช้ API Test Endpoint (แนะนำ)

เปิด URL นี้ใน browser หรือใช้ curl:

```
https://farcasterabstact.wtf/api/test-pinata
```

**ผลลัพธ์ที่คาดหวัง:**

✅ **ถ้าซิงค์แล้ว:**
```json
{
  "status": "configured",
  "method": "JWT",
  "message": "Pinata JWT token is configured and working correctly",
  "verified": true
}
```

❌ **ถ้ายังไม่ซิงค์:**
```json
{
  "status": "not_configured",
  "method": null,
  "message": "Pinata credentials are not configured...",
  "verified": false
}
```

## วิธีที่ 2: ตรวจสอบผ่าน Vercel Dashboard

1. ไปที่ https://vercel.com/dashboard
2. เลือกโปรเจกต์ **baldgame** (หรือชื่อโปรเจกต์ของคุณ)
3. ไปที่ **Settings** → **Environment Variables**
4. ตรวจสอบว่ามี `PINATA_JWT` อยู่
5. ตรวจสอบว่าเลือก Environment ถูกต้อง (Production, Preview, Development)

## วิธีที่ 3: ทดสอบโดยการ Mint NFT

1. ไปที่ https://farcasterabstact.wtf/mint
2. Sign In ด้วย Farcaster
3. Generate Art
4. คลิก Mint NFT
5. เปิด Browser Console (F12)
6. ดู log:
   - ✅ ถ้าเห็น `"Image uploaded to IPFS: https://gateway.pinata.cloud/ipfs/..."` = **Pinata ทำงานแล้ว**
   - ❌ ถ้าเห็น `"Pinata not configured, using base64 directly"` = **Pinata ยังไม่ซิงค์**

## วิธีที่ 4: ใช้ Vercel CLI

```bash
# ตรวจสอบ environment variables
vercel env ls

# ควรเห็น PINATA_JWT ในรายการ
```

## สาเหตุที่ Pinata อาจยังไม่ซิงค์

1. **ยังไม่ได้ตั้งค่า Environment Variable** ใน Vercel
   - ไปที่ Vercel Dashboard → Settings → Environment Variables
   - เพิ่ม `PINATA_JWT` ด้วยค่า JWT token

2. **ตั้งค่าแล้วแต่ยังไม่ได้ Redeploy**
   - ไปที่ Vercel Dashboard → Deployments
   - คลิก "..." → Redeploy

3. **ตั้งค่าใน Environment ผิด**
   - ตรวจสอบว่าเลือก Production, Preview, Development ถูกต้อง

4. **JWT Token หมดอายุหรือไม่ถูกต้อง**
   - ตรวจสอบว่า JWT token ยังใช้งานได้
   - สร้าง JWT token ใหม่จาก Pinata Dashboard

## วิธีแก้ไข

### ถ้ายังไม่ได้ตั้งค่า:

1. ใช้สคริปต์ PowerShell:
   ```powershell
   .\add-pinata-env.ps1
   ```

2. หรือตั้งค่าผ่าน Vercel Dashboard:
   - ไปที่ Settings → Environment Variables
   - เพิ่ม `PINATA_JWT` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (JWT token ของคุณ)

3. **Redeploy** project:
   - ไปที่ Deployments → คลิก "..." → Redeploy

### ถ้าตั้งค่าแล้วแต่ยังไม่ทำงาน:

1. ตรวจสอบว่าได้ Redeploy แล้ว
2. ตรวจสอบ logs ใน Vercel Dashboard → Deployments → Functions
3. ลองใช้ API test endpoint: https://farcasterabstact.wtf/api/test-pinata

## ตรวจสอบสถานะตอนนี้

เปิด URL นี้เพื่อตรวจสอบ:
**https://farcasterabstact.wtf/api/test-pinata**

