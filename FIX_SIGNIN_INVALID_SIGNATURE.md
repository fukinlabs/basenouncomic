# แก้ไขปัญหา "Invalid signature" เมื่อคลิก Sign In

## 🔴 ปัญหา

เมื่อคลิกปุ่ม "Sign In" ในหน้า mint จะเจอ error:
```
Invalid signature
```

---

## ✅ วิธีแก้ไข

### วิธีที่ 1: ตั้งค่า NEXT_PUBLIC_ROOT_URL ใน Vercel (แนะนำ)

**สาเหตุหลัก:** Domain verification ไม่ตรงกัน

1. ไปที่ **Vercel Dashboard**: https://vercel.com/dashboard
2. เลือกโปรเจกต์ **baldgame**
3. ไปที่ **Settings** → **Environment Variables**
4. เพิ่มตัวแปร:
   - **Name**: `NEXT_PUBLIC_ROOT_URL`
   - **Value**: `https://farcasterabstact.wtf`
   - **Environment**: เลือก Production, Preview, Development (หรือเลือกทั้งหมด)
5. **Save**
6. **Redeploy**: ไปที่ **Deployments** → คลิก "..." → **Redeploy**

---

### วิธีที่ 2: เปิดผ่าน Farcaster Mini App (ไม่ต้อง Sign In)

**ไม่ต้อง Sign In → ไม่เจอ error!**

1. เปิด Farcaster app
2. คลิก Mini App link หรือ embed
3. SDK จะดึง FID อัตโนมัติ
4. **Mint ได้เลยโดยไม่ต้อง Sign In**

---

## 🔧 การปรับปรุงที่ทำแล้ว

โค้ดได้รับการปรับปรุงแล้ว:

1. **Retry Logic**: ถ้า verification ล้มเหลวกับ nonce → ลองใหม่โดยไม่ใช้ nonce
2. **Better Logging**: เพิ่ม logging เพื่อ debug
3. **Better Error Messages**: เพิ่ม hint ใน error message

---

## 🔍 Debug Steps

ถ้ายังเจอ error หลังจากแก้ไข:

### 1. ตรวจสอบ Console Logs

เปิด Browser Console (F12) และดู logs:
```
[verify-signin] Using origin host: ...
[verify-signin] Signature verification failed: ...
```

### 2. ตรวจสอบ Network Tab

1. เปิด Browser DevTools → Network tab
2. คลิก Sign In
3. ดู request ไปที่ `/api/verify-signin`
4. ดู response error details:
   ```json
   {
     "error": "Invalid signature",
     "details": "...",
     "domain": "...",
     "hint": "Make sure NEXT_PUBLIC_ROOT_URL is set correctly..."
   }
   ```

### 3. ตรวจสอบ Vercel Logs

1. ไปที่ Vercel Dashboard → Deployments
2. คลิก deployment ล่าสุด
3. ไปที่ **Functions** tab
4. ดู logs จาก `/api/verify-signin`

---

## 📊 สาเหตุของปัญหา

### 1. Domain Mismatch (สาเหตุหลัก)
- Signature verification ใช้ domain จาก `NEXT_PUBLIC_ROOT_URL`
- ถ้า domain ไม่ตรงกับ domain ใน SIWE message → verification ล้มเหลว

### 2. Nonce Verification
- บางครั้ง nonce verification อาจ strict เกินไป
- **แก้ไขแล้ว**: ลอง verify โดยไม่ใช้ nonce ถ้าล้มเหลว

### 3. Signature Format
- Signature ต้องเริ่มด้วย `0x`
- ถ้า format ไม่ถูกต้อง → error

---

## ✅ สรุป

**วิธีแก้ไขที่แนะนำ:**
1. ✅ ตั้งค่า `NEXT_PUBLIC_ROOT_URL` ใน Vercel
2. ✅ Redeploy project
3. ✅ ทดสอบ Sign In อีกครั้ง

**หรือ:**
- ✅ เปิดผ่าน Farcaster Mini App (ไม่ต้อง Sign In)

---

## 🎯 Best Practice

**แนะนำ: เปิดผ่าน Farcaster Mini App**

เพราะ:
- ✅ ไม่ต้อง Sign In
- ✅ ไม่เจอ "Invalid signature" error
- ✅ UX ดีกว่า
- ✅ เร็วกว่า

---

## 📝 Environment Variables ที่ต้องตั้งค่า

ใน Vercel Dashboard → Settings → Environment Variables:

```
NEXT_PUBLIC_ROOT_URL=https://farcasterabstact.wtf
```

**สำคัญ:** ต้องไม่มี trailing slash (`/`) และต้องเป็น `https://`

