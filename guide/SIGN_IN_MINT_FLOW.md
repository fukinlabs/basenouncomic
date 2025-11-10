# Flow การ Sign In และ Mint NFT

## สรุป

**ใช่ ต้อง Sign In Farcaster ก่อนแล้วค่อย Mint** แต่มี 2 กรณี:

### กรณีที่ 1: FID ได้อัตโนมัติ (ไม่ต้อง Sign In)
- ถ้าเปิด app ผ่าน Farcaster Mini App
- SDK จะดึง FID จาก context อัตโนมัติ
- **ไม่ต้อง Sign In** → สามารถ Mint ได้เลย

### กรณีที่ 2: FID ไม่ได้อัตโนมัติ (ต้อง Sign In)
- ถ้าเปิด app ผ่าน browser ธรรมดา
- SDK ไม่สามารถดึง FID ได้
- **ต้อง Sign In** → ก่อน Mint

---

## Flow การทำงาน

### 1. ตรวจสอบ FID (อัตโนมัติ)

```typescript
// บรรทัด 79-96: ดึง FID จาก SDK context อัตโนมัติ
useEffect(() => {
  const getContext = async () => {
    try {
      const inMini = await sdk.isInMiniApp();
      if (!inMini) return;

      const ctx = await sdk.context;
      if (ctx?.user?.fid) {
        setFid(ctx.user.fid.toString()); // ✅ ได้ FID อัตโนมัติ
      }
    } catch (error) {
      console.error("Error getting context:", error);
    }
  };
  getContext();
}, []);
```

**ผลลัพธ์:**
- ✅ ถ้าได้ FID → ข้ามไปขั้นตอน Mint ได้เลย
- ❌ ถ้าไม่ได้ FID → ต้อง Sign In

---

### 2. Sign In Farcaster (ถ้าจำเป็น)

```typescript
// บรรทัด 98-153: ฟังก์ชัน Sign In
const handleSignIn = async () => {
  // Generate nonce
  const nonce = Math.random().toString(36).substring(2, 15);
  
  // Request Sign In
  const result = await sdk.actions.signIn({
    nonce,
    acceptAuthAddress: true,
  });

  // Verify on server
  const verifyResponse = await fetch("/api/verify-signin", {
    method: "POST",
    body: JSON.stringify({
      message: result.message,
      signature: result.signature,
      nonce,
    }),
  });

  // Set FID after verification
  if (verifyData.success && verifyData.user?.fid) {
    setFid(verifyData.user.fid.toString()); // ✅ ได้ FID หลัง Sign In
    setIsSignedIn(true);
  }
};
```

---

### 3. UI Logic

```typescript
// บรรทัด 610-637: ถ้าไม่มี FID → แสดงหน้า Sign In
{!fid ? (
  <div className="bg-white p-8 rounded-lg shadow-lg">
    <h2>Sign In with Farcaster</h2>
    <button onClick={handleSignIn}>
      🔐 Sign In with Farcaster
    </button>
  </div>
) : (
  // แสดงหน้า Mint
)}

// บรรทัด 769-791: ปุ่ม Sign In (ถ้ายังไม่ได้ Sign In)
{!isSignedIn && fid ? (
  <button onClick={handleSignIn}>
    SIGN IN FARCASTER
  </button>
) : (
  // ปุ่ม Mint
)}

// บรรทัด 793-817: ปุ่ม Mint (ถ้า Sign In แล้ว)
<button onClick={handleMint}>
  MINT
</button>
```

---

## สรุป Flow

```
1. เปิด App
   ↓
2. ตรวจสอบ FID จาก SDK Context
   ├─ ✅ ได้ FID → ข้ามไปขั้นตอน Mint
   └─ ❌ ไม่ได้ FID → ต้อง Sign In
      ↓
3. Click "SIGN IN FARCASTER"
   ↓
4. Verify Sign In บน Server
   ↓
5. ได้ FID → แสดงปุ่ม "MINT"
   ↓
6. Click "MINT"
   ↓
7. Mint NFT
```

---

## คำถามที่พบบ่อย

### Q: ต้อง Sign In ทุกครั้งไหม?

**A:** ไม่จำเป็น
- ถ้าเปิดผ่าน Farcaster Mini App → ได้ FID อัตโนมัติ (ไม่ต้อง Sign In)
- ถ้าเปิดผ่าน browser ธรรมดา → ต้อง Sign In

### Q: Sign In กับ Mint ต่างกันยังไง?

**A:**
- **Sign In** = ยืนยันตัวตนกับ Farcaster (ได้ FID)
- **Mint** = สร้าง NFT บน blockchain (ใช้ FID + Wallet)

### Q: ทำไมต้อง Sign In?

**A:**
- เพื่อยืนยันว่าเป็นเจ้าของ FID
- เพื่อป้องกันการ mint NFT ด้วย FID ของคนอื่น
- Contract มี `mintedFid` mapping เพื่อป้องกันการ mint ซ้ำ

---

## Code ที่เกี่ยวข้อง

### 1. ดึง FID อัตโนมัติ
```typescript
// app/mint/page.tsx:79-96
useEffect(() => {
  const getContext = async () => {
    const ctx = await sdk.context;
    if (ctx?.user?.fid) {
      setFid(ctx.user.fid.toString());
    }
  };
  getContext();
}, []);
```

### 2. Sign In
```typescript
// app/mint/page.tsx:100-153
const handleSignIn = async () => {
  const result = await sdk.actions.signIn({ nonce, acceptAuthAddress: true });
  // Verify and set FID
};
```

### 3. Mint
```typescript
// app/mint/page.tsx:366-473
const handleMint = async () => {
  if (!fid) return; // ต้องมี FID ก่อน
  // Mint NFT
};
```

---

## สรุป

**ใช่ ต้อง Sign In Farcaster ก่อนแล้วค่อย Mint** แต่:

1. **ถ้าเปิดผ่าน Farcaster Mini App** → ได้ FID อัตโนมัติ (ไม่ต้อง Sign In)
2. **ถ้าเปิดผ่าน browser ธรรมดา** → ต้อง Sign In ก่อน

**Flow:**
- ไม่มี FID → Sign In → ได้ FID → Mint NFT
- มี FID แล้ว → Mint NFT ได้เลย

