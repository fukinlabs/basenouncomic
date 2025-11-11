# On-Chain Art Generation Gas Optimization Guide

## 🎯 เป้าหมาย: Generate Art แบบ On-Chain ประหยัด Gas Cost มากที่สุด

### ปัญหา
- HTML base64 ขนาดใหญ่ (~50-100 KB)
- Gas cost สูงมาก (~1,500,000-2,000,000 gas)
- Basescan ไม่แสดง (0% success)

---

## ✅ วิธีประหยัด Gas Cost มากที่สุด (เรียงตามประสิทธิภาพ)

### 1. **Upload HTML ไป Pinata IPFS แล้วเก็บ IPFS Hash** ⭐⭐⭐ (แนะนำที่สุด)

**Gas Cost:** ~120,000 gas (ประหยัด 93-94%)

**วิธีทำ:**
```typescript
// app/mint/page.tsx
// Step 1: Generate HTML canvas
const htmlResponse = await fetch(`/api/generate-html-canvas?fid=${fid}&minify=true`);
const { htmlBase64 } = await htmlResponse.json();

// Step 2: Upload HTML to Pinata IPFS
const uploadResponse = await fetch("/api/upload-pinata", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    imageBase64: `data:text/html;base64,${htmlBase64}`, // HTML base64
    tokenId: fid,
    fid,
    contentType: "text/html", // Specify HTML content type
  }),
});

const { image: { ipfsHash } } = await uploadResponse.json();

// Step 3: Store only IPFS hash on-chain
imageData = `ipfs://${ipfsHash}`; // Gas: ~120,000
```

**ข้อดี:**
- ✅ Gas cost ต่ำสุด (~120,000)
- ✅ Basescan แสดงได้ 100%
- ✅ Interactive (frontend fetch HTML จาก IPFS)
- ✅ ไม่จำกัดขนาด

**ข้อเสีย:**
- ⚠️ ต้องใช้ Pinata (free tier: 1 GB, 100 requests/day)

---

### 2. **Minify HTML ก่อนเก็บ On-Chain** ⭐

**Gas Cost:** ~1,050,000-1,400,000 gas (ประหยัด 10-30%)

**วิธีทำ:**
```typescript
// app/mint/page.tsx
// Generate minified HTML canvas
const htmlResponse = await fetch(`/api/generate-html-canvas?fid=${fid}&minify=true`);
const { htmlBase64 } = await htmlResponse.json();

// Store minified HTML base64 on-chain
imageData = htmlBase64; // Gas: ~1,050,000-1,400,000
```

**ข้อดี:**
- ✅ Interactive (HTML canvas)
- ✅ ไม่ต้องใช้ Pinata
- ✅ ประหยัด 10-30% จาก original

**ข้อเสีย:**
- ❌ Gas cost ยังสูง (~1,050,000-1,400,000)
- ❌ Basescan ไม่แสดง (0%)

---

### 3. **Compress HTML ก่อนเก็บ On-Chain** ⭐

**Gas Cost:** ~900,000-1,200,000 gas (ประหยัด 20-40%)

**วิธีทำ:**
```typescript
// app/mint/page.tsx
// Generate compressed HTML canvas
const htmlResponse = await fetch(`/api/generate-html-canvas?fid=${fid}&compress=true`);
const { htmlBase64 } = await htmlResponse.json();

// Store compressed HTML base64 on-chain
imageData = htmlBase64; // Gas: ~900,000-1,200,000
```

**ข้อดี:**
- ✅ Interactive (HTML canvas)
- ✅ ไม่ต้องใช้ Pinata
- ✅ ประหยัด 20-40% จาก original

**ข้อเสีย:**
- ❌ Gas cost ยังสูง (~900,000-1,200,000)
- ❌ Basescan ไม่แสดง (0%)
- ⚠️ Code อ่านยาก (shortened variable names)

---

### 4. **ใช้ PNG Base64 แทน HTML** ⭐⭐

**Gas Cost:** ~200,000-300,000 gas (ประหยัด 80-87%)

**วิธีทำ:**
```typescript
// app/mint/page.tsx
// Generate PNG from canvas
const canvas = document.createElement('canvas');
// Render art to canvas
const pngBase64 = canvas.toDataURL('image/png');

// Store PNG base64 on-chain
imageData = pngBase64.replace('data:image/png;base64,', ''); // Gas: ~200,000-300,000
```

**ข้อดี:**
- ✅ Gas cost ต่ำ (~200,000-300,000)
- ✅ Basescan แสดงได้ 100%
- ✅ ไม่ต้องใช้ Pinata

**ข้อเสีย:**
- ❌ ไม่ interactive (static image)

---

## 📊 Comparison

| Method | Gas Cost | Savings | Basescan | Interactive | Pinata |
|--------|----------|---------|----------|-------------|--------|
| **Original HTML** | ~1,500,000-2,000,000 | 0% | ❌ 0% | ✅ Yes | ❌ No |
| **Minified HTML** | ~1,050,000-1,400,000 | 10-30% | ❌ 0% | ✅ Yes | ❌ No |
| **Compressed HTML** | ~900,000-1,200,000 | 20-40% | ❌ 0% | ✅ Yes | ❌ No |
| **PNG Base64** | ~200,000-300,000 | 80-87% | ✅ 100% | ❌ No | ❌ No |
| **IPFS Hash (HTML)** | ~120,000 | 93-94% | ✅ 100% | ✅ Yes* | ✅ Yes |

*Interactive ถ้า frontend fetch HTML จาก IPFS

---

## 🚀 Implementation: Upload HTML ไป IPFS (แนะนำที่สุด)

### Step 1: Update Upload API to Support HTML

```typescript
// app/api/upload-pinata/route.ts
// Support HTML content type
const contentType = request.body.contentType || "image/png";
const fileExtension = contentType === "text/html" ? "html" : "png";
```

### Step 2: Update Frontend to Upload HTML

```typescript
// app/mint/page.tsx
const handleMint = async () => {
  // Step 1: Generate HTML canvas (minified for smaller size)
  const htmlResponse = await fetch(`/api/generate-html-canvas?fid=${fid}&minify=true`);
  const { htmlBase64 } = await htmlResponse.json();
  
  // Step 2: Upload HTML to Pinata IPFS
  const uploadResponse = await fetch("/api/upload-pinata", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageBase64: `data:text/html;base64,${htmlBase64}`,
      tokenId: fid,
      fid,
      contentType: "text/html", // Specify HTML
    }),
  });
  
  const { image: { ipfsHash } } = await uploadResponse.json();
  
  // Step 3: Store IPFS hash on-chain (lowest gas cost)
  imageData = `ipfs://${ipfsHash}`; // Gas: ~120,000
};
```

---

## 📈 Gas Cost Breakdown

### Original HTML Base64
- HTML Size: ~15,000 bytes
- Base64 Size: ~20,000 bytes
- Gas Cost: ~1,500,000-2,000,000
- **Savings: 0%**

### Minified HTML Base64
- HTML Size: ~12,000 bytes (20% smaller)
- Base64 Size: ~16,000 bytes
- Gas Cost: ~1,050,000-1,400,000
- **Savings: 10-30%**

### Compressed HTML Base64
- HTML Size: ~10,000 bytes (33% smaller)
- Base64 Size: ~13,333 bytes
- Gas Cost: ~900,000-1,200,000
- **Savings: 20-40%**

### IPFS Hash (HTML)
- Hash Size: ~46 bytes
- Gas Cost: ~120,000
- **Savings: 93-94%** ⭐

---

## 🎯 คำแนะนำ

### สำหรับ Production (แนะนำที่สุด)

**ใช้ IPFS Hash (HTML):**
1. Generate HTML canvas (minified)
2. Upload HTML ไป Pinata IPFS
3. เก็บ IPFS hash on-chain
4. Frontend fetch HTML จาก IPFS สำหรับ interactive display

**Gas Cost:** ~120,000 (ประหยัด 93-94%)
**Basescan:** 100% success
**Interactive:** ✅ Yes

---

### Fallback (ถ้า Pinata ไม่พร้อม)

**Minify HTML:**
1. Generate HTML canvas (minified)
2. เก็บ minified HTML base64 on-chain

**Gas Cost:** ~1,050,000-1,400,000 (ประหยัด 10-30%)
**Basescan:** 0% success
**Interactive:** ✅ Yes

---

## ✅ สรุป

**วิธีประหยัด Gas Cost มากที่สุด:**

1. **IPFS Hash (HTML)** ⭐⭐⭐ - Gas: ~120,000 (ประหยัด 93-94%)
2. **PNG Base64** ⭐⭐ - Gas: ~200,000-300,000 (ประหยัด 80-87%)
3. **Compressed HTML** ⭐ - Gas: ~900,000-1,200,000 (ประหยัด 20-40%)
4. **Minified HTML** ⭐ - Gas: ~1,050,000-1,400,000 (ประหยัด 10-30%)

**แนะนำ:** ใช้ IPFS Hash (HTML) สำหรับ production (ประหยัดที่สุด, Basescan 100%, Interactive)

