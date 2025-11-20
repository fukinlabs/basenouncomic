# วิธี Debug "Invalid signature" Error

## 🔍 วิธีตรวจสอบปัญหา

### 1. ใช้ Debug API Endpoint

เปิด URL นี้ใน browser:
```
https://farcasterabstact.wtf/api/debug-signin
```

**ผลลัพธ์ที่คาดหวัง:**
```json
{
  "domain": "farcasterabstact.wtf",
  "environment": {
    "NEXT_PUBLIC_ROOT_URL": "https://farcasterabstact.wtf",
    "NEXT_PUBLIC_URL": "NOT SET",
    "VERCEL_URL": "...",
    "VERCEL_ENV": "production"
  },
  "recommendation": {
    "shouldSet": false,
    "recommendedValue": "https://farcasterabstact.wtf",
    "message": "✅ NEXT_PUBLIC_ROOT_URL is set correctly"
  }
}
```

**ถ้าเห็น:**
```json
{
  "recommendation": {
    "shouldSet": true,
    "message": "⚠️ Please set NEXT_PUBLIC_ROOT_URL=https://farcasterabstact.wtf in Vercel"
  }
}
```
→ **ต้องตั้งค่า `NEXT_PUBLIC_ROOT_URL` ใน Vercel**

---

### 2. ตรวจสอบ Console Logs

เปิด Browser Console (F12) และดู logs เมื่อคลิก Sign In:

```
[Mint] Starting Farcaster sign in...
[Mint] Generated nonce: ...
[Mint] Sign In result: ...
[verify-signin] Using origin host: ...
[verify-signin] Domain extracted from message: ...
[verify-signin] ⚠️ Domain mismatch detected: ...
```

**ถ้าเห็น "Domain mismatch":**
- Domain ใน message ไม่ตรงกับ domain ที่ใช้ verify
- **แก้ไข:** ตั้งค่า `NEXT_PUBLIC_ROOT_URL` ให้ตรงกับ domain ใน message

---

### 3. ตรวจสอบ Network Tab

1. เปิด Browser DevTools → Network tab
2. คลิก Sign In
3. ดู request ไปที่ `/api/verify-signin`
4. ดู response:

```json
{
  "error": "Invalid signature",
  "details": "...",
  "domain": "farcasterabstact.wtf",
  "messageDomain": "baldgame-xxx.vercel.app",
  "domainMismatch": true,
  "hint": "Domain mismatch: message uses \"baldgame-xxx.vercel.app\" but verification uses \"farcasterabstact.wtf\". Please set NEXT_PUBLIC_ROOT_URL=https://baldgame-xxx.vercel.app in Vercel."
}
```

**ถ้าเห็น `domainMismatch: true`:**
- Domain ไม่ตรงกัน
- ดู hint ใน response เพื่อแก้ไข

---

## ✅ วิธีแก้ไข

### ตั้งค่า NEXT_PUBLIC_ROOT_URL ใน Vercel

1. ไปที่ **Vercel Dashboard**: https://vercel.com/dashboard
2. เลือกโปรเจกต์ **baldgame**
3. ไปที่ **Settings** → **Environment Variables**
4. เพิ่มตัวแปร:
   - **Name**: `NEXT_PUBLIC_ROOT_URL`
   - **Value**: `https://farcasterabstact.wtf` (หรือ domain ที่ใช้จริง)
   - **Environment**: เลือก Production, Preview, Development
5. **Save**
6. **Redeploy**: ไปที่ **Deployments** → คลิก "..." → **Redeploy**

---

## 🔍 สาเหตุของปัญหา

### 1. Domain Mismatch (สาเหตุหลัก)

**ปัญหา:**
- SIWE message ใช้ domain หนึ่ง (เช่น `baldgame-xxx.vercel.app`)
- Verification ใช้ domain อื่น (เช่น `farcasterabstact.wtf`)
- Domain ไม่ตรงกัน → Signature verification ล้มเหลว

**แก้ไข:**
- ตั้งค่า `NEXT_PUBLIC_ROOT_URL` ให้ตรงกับ domain ที่ใช้ใน production

### 2. Environment Variable ไม่ได้ตั้งค่า

**ปัญหา:**
- `NEXT_PUBLIC_ROOT_URL` ไม่ได้ตั้งค่าใน Vercel
- ระบบใช้ fallback domain ที่อาจไม่ตรง

**แก้ไข:**
- ตั้งค่า `NEXT_PUBLIC_ROOT_URL` ใน Vercel

---

## 📊 ตรวจสอบ Domain

### วิธีที่ 1: ใช้ Debug API
```
https://farcasterabstact.wtf/api/debug-signin
```

### วิธีที่ 2: ดู Console Logs
```
[verify-signin] Domain extracted from message: ...
[verify-signin] Using origin host: ...
```

### วิธีที่ 3: ดู Error Response
```json
{
  "domain": "...",
  "messageDomain": "...",
  "domainMismatch": true/false
}
```

---

## ✅ สรุป

**ถ้าเจอ "Invalid signature":**

1. ✅ ตรวจสอบ domain ด้วย `/api/debug-signin`
2. ✅ ดู error response เพื่อดู domain mismatch
3. ✅ ตั้งค่า `NEXT_PUBLIC_ROOT_URL` ใน Vercel
4. ✅ Redeploy project
5. ✅ ทดสอบ Sign In อีกครั้ง

**หรือ:**
- ✅ เปิดผ่าน Farcaster Mini App (ไม่ต้อง Sign In)

