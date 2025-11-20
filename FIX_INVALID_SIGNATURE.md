# แก้ไขปัญหา "Invalid signature" ในหน้า Mint

## 🔴 ปัญหา

เมื่อเปิดหน้า mint ใน Browser ธรรมดา (ไม่ใช่ Mini App) และพยายาม Sign In จะเจอ error:
```
Invalid signature
```

---

## ✅ วิธีแก้ไข

### วิธีที่ 1: เปิดผ่าน Farcaster Mini App (แนะนำที่สุด)

**ไม่ต้อง Sign In → ไม่เจอ error!**

1. เปิด Farcaster app
2. คลิก Mini App link หรือ embed
3. SDK จะดึง FID อัตโนมัติ
4. **Mint ได้เลยโดยไม่ต้อง Sign In**

---

### วิธีที่ 2: ตรวจสอบ Domain Configuration

Error "Invalid signature" มักเกิดจาก domain verification ไม่ตรงกัน

**ตรวจสอบ Environment Variables ใน Vercel:**
1. ไปที่ Vercel Dashboard → Settings → Environment Variables
2. ตรวจสอบว่ามี:
   - `NEXT_PUBLIC_ROOT_URL` = `https://farcasterabstact.wtf`
   - หรือ `NEXT_PUBLIC_URL` = `https://farcasterabstact.wtf`

**ถ้ายังไม่มี:**
1. เพิ่ม `NEXT_PUBLIC_ROOT_URL` = `https://farcasterabstact.wtf`
2. เลือก Environment: Production, Preview, Development
3. Save และ Redeploy

---

### วิธีที่ 3: Clear Cache และลองใหม่

1. **Clear Browser Cache:**
   - Chrome: Ctrl+Shift+Delete → Clear browsing data
   - หรือเปิด Incognito mode

2. **Clear localStorage:**
   - เปิด Browser Console (F12)
   - รัน: `localStorage.clear()`
   - Refresh หน้า

3. **ลอง Sign In ใหม่**

---

## 🔍 สาเหตุของปัญหา

### 1. Domain Mismatch
- Signature verification ใช้ domain จาก `NEXT_PUBLIC_ROOT_URL`
- ถ้า domain ไม่ตรง → verification ล้มเหลว

### 2. Signature Format
- Signature ต้องเริ่มด้วย `0x`
- ถ้า format ไม่ถูกต้อง → error

### 3. Message Format
- Message ต้องเป็น SIWE (Sign-In With Ethereum) format
- ต้องมี `farcaster.xyz` หรือ `Sign in with Farcaster`

---

## 📊 เปรียบเทียบ

| กรณี | Sign In จำเป็น? | "Invalid signature" | วิธีแก้ |
|------|----------------|---------------------|---------|
| **Mini App** | ❌ ไม่ต้อง | ❌ ไม่เจอ | เปิดผ่าน Mini App |
| **Browser** | ✅ ต้อง | ⚠️ อาจเจอ | ตั้งค่า `NEXT_PUBLIC_ROOT_URL` |

---

## 🎯 Best Practice

**แนะนำ: เปิดผ่าน Farcaster Mini App**

เพราะ:
- ✅ ไม่ต้อง Sign In
- ✅ ไม่เจอ "Invalid signature" error
- ✅ UX ดีกว่า
- ✅ เร็วกว่า

---

## 🔧 Debug Steps

ถ้ายังเจอ error หลังจากแก้ไข:

1. **ตรวจสอบ Console Logs:**
   ```
   [verify-signin] Using origin host: ...
   [verify-signin] Signature verification failed: ...
   ```

2. **ตรวจสอบ Network Tab:**
   - ดู request ไปที่ `/api/verify-signin`
   - ดู response error details

3. **ตรวจสอบ Environment Variables:**
   ```bash
   # ใน Vercel Dashboard
   NEXT_PUBLIC_ROOT_URL=https://farcasterabstact.wtf
   ```

---

## ✅ สรุป

**ถ้าเปิดผ่าน Farcaster Mini App:**
- ✅ ไม่ต้อง Sign In
- ✅ ไม่เจอ "Invalid signature"
- ✅ Mint ได้เลย

**ถ้าเปิดผ่าน Browser:**
- ✅ ตั้งค่า `NEXT_PUBLIC_ROOT_URL` ใน Vercel
- ✅ Clear cache และลองใหม่
- ✅ ถ้ายังไม่หาย → ใช้ Mini App แทน

