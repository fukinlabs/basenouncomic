# HTML Base64 Gas Optimization Guide

## 🎯 เป้าหมาย: เก็บ HTML Base64 แบบ On-Chain แบบประหยัด

### ปัญหา
- HTML base64 ขนาดใหญ่ (~50-100 KB)
- Gas cost สูงมาก (~1,500,000-2,000,000 gas)
- Basescan ไม่แสดง (0% success)

---

## ✅ วิธีประหยัด Gas (เรียงตามประสิทธิภาพ)

### 1. **ใช้ IPFS Hash (แนะนำที่สุด)** ⭐

**Gas Cost:** ~120,000 gas (ประหยัด 93-94%)

```typescript
// app/mint/page.tsx
// Upload HTML to Pinata IPFS first
const htmlBase64 = generateHTMLCanvasBase64({ tokenId: fid });
const ipfsHash = await uploadToPinata(htmlBase64);

// Store only IPFS hash on-chain
imageData = `ipfs://${ipfsHash}`;
```

**ข้อดี:**
- ✅ Gas cost ต่ำสุด (~120,000)
- ✅ Basescan แสดงได้ 100%
- ✅ Decentralized storage
- ✅ ไม่จำกัดขนาด

**ข้อเสีย:**
- ⚠️ ต้องใช้ Pinata (free tier: 1 GB, 100 requests/day)

---

### 2. **Minify HTML ก่อนเก็บ** ⭐⭐

**Gas Savings:** ~10-30% (จาก ~1,500,000 → ~1,050,000-1,350,000)

```typescript
// lib/compress-html.ts
import { minifyHTML, htmlToBase64 } from '@/lib/compress-html';

// Minify HTML before converting to base64
const html = generateHTMLCanvas({ tokenId: fid });
const minified = minifyHTML(html);
const base64 = htmlToBase64(minified);

// Send to contract
imageData = base64;
```

**การ Minify:**
- ลบ whitespace
- ลบ comments
- ลบ spaces ระหว่าง tags
- ลบ spaces รอบ attributes

**Gas Savings:** ~10-30%

---

### 3. **Compress HTML (Aggressive)** ⭐

**Gas Savings:** ~20-40% (จาก ~1,500,000 → ~900,000-1,200,000)

```typescript
// lib/compress-html.ts
import { compressHTML, htmlToBase64 } from '@/lib/compress-html';

// Compress HTML (minify + shorten variable names)
const html = generateHTMLCanvas({ tokenId: fid });
const compressed = compressHTML(html);
const base64 = htmlToBase64(compressed);

// Send to contract
imageData = base64;
```

**การ Compress:**
- Minify HTML
- Shorten variable names (`seedCounter` → `s`)
- อาจทำให้ code อ่านยากขึ้น

**Gas Savings:** ~20-40%

**⚠️ ข้อระวัง:** อาจทำให้ code อ่านยากและ debug ยาก

---

### 4. **ใช้ PNG Base64 แทน** ⭐⭐⭐

**Gas Cost:** ~200,000-300,000 gas (ประหยัด 80-87%)

```typescript
// Convert HTML canvas to PNG before minting
const canvas = document.createElement('canvas');
// Render HTML canvas to PNG
const pngBase64 = canvas.toDataURL('image/png');

// Send PNG base64 to contract
imageData = pngBase64.replace('data:image/png;base64,', '');
```

**ข้อดี:**
- ✅ Gas cost ต่ำ (~200,000-300,000)
- ✅ Basescan แสดงได้ 100%
- ✅ ไม่ต้องใช้ Pinata

**ข้อเสีย:**
- ❌ ไม่ interactive (static image)
- ❌ ขนาดใหญ่กว่า IPFS hash

---

## 📊 Comparison

| Method | Gas Cost | Savings | Basescan | Interactive |
|--------|----------|---------|----------|-------------|
| **Original HTML** | ~1,500,000-2,000,000 | 0% | ❌ 0% | ✅ Yes |
| **Minified HTML** | ~1,050,000-1,400,000 | 10-30% | ❌ 0% | ✅ Yes |
| **Compressed HTML** | ~900,000-1,200,000 | 20-40% | ❌ 0% | ✅ Yes |
| **PNG Base64** | ~200,000-300,000 | 80-87% | ✅ 100% | ❌ No |
| **IPFS Hash** | ~120,000 | 93-94% | ✅ 100% | ✅ Yes* |

*Interactive ถ้า frontend fetch HTML จาก IPFS

---

## 🚀 Implementation

### Option 1: Minify HTML (ง่ายที่สุด)

```typescript
// app/mint/page.tsx
import { minifyHTML, htmlToBase64 } from '@/lib/compress-html';

// Generate HTML
const html = generateHTMLCanvas({ tokenId: fid });

// Minify and convert to base64
const minified = minifyHTML(html);
const base64 = htmlToBase64(minified);

// Send to contract
imageData = base64;
```

**Gas Savings:** ~10-30%

---

### Option 2: Compress HTML (ประหยัดมากขึ้น)

```typescript
// app/mint/page.tsx
import { compressHTML, htmlToBase64 } from '@/lib/compress-html';

// Generate HTML
const html = generateHTMLCanvas({ tokenId: fid });

// Compress and convert to base64
const compressed = compressHTML(html);
const base64 = htmlToBase64(compressed);

// Send to contract
imageData = base64;
```

**Gas Savings:** ~20-40%

---

### Option 3: Upload to IPFS (ประหยัดที่สุด) ⭐

```typescript
// app/mint/page.tsx
// Generate HTML
const html = generateHTMLCanvas({ tokenId: fid });
const htmlBase64 = htmlToBase64(html);

// Upload HTML to Pinata IPFS
const uploadResponse = await fetch('/api/upload-pinata', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    file: htmlBase64,
    fileName: `nft-${fid}.html`,
    contentType: 'text/html',
  }),
});

const { ipfsHash } = await uploadResponse.json();

// Store only IPFS hash on-chain
imageData = `ipfs://${ipfsHash}`;
```

**Gas Savings:** 93-94% (จาก ~1,500,000 → ~120,000)

---

## 📈 Size Comparison Example

**Original HTML:** ~15,000 bytes
- Base64: ~20,000 bytes
- Estimated Gas: ~320,000

**Minified HTML:** ~12,000 bytes
- Base64: ~16,000 bytes
- Estimated Gas: ~256,000
- **Savings: 20%**

**Compressed HTML:** ~10,000 bytes
- Base64: ~13,333 bytes
- Estimated Gas: ~213,000
- **Savings: 33%**

**IPFS Hash:** ~46 bytes
- Estimated Gas: ~120,000
- **Savings: 93%**

---

## 🎯 คำแนะนำ

### สำหรับ Production

**แนะนำ: ใช้ IPFS Hash**
- Gas cost ต่ำสุด (~120,000)
- Basescan แสดงได้ 100%
- Interactive (frontend fetch HTML จาก IPFS)

**Fallback: Minify HTML**
- ถ้า Pinata ไม่พร้อมใช้งาน
- Gas savings: ~10-30%
- ยังคง interactive

**ไม่แนะนำ: Compress HTML**
- อาจทำให้ code อ่านยาก
- Gas savings เพิ่มขึ้นเล็กน้อย (~20-40%)

---

## ✅ สรุป

**วิธีประหยัด Gas สำหรับ HTML Base64:**

1. **IPFS Hash** (แนะนำ) - Gas: ~120,000 (ประหยัด 93-94%)
2. **Minify HTML** - Gas: ~1,050,000-1,400,000 (ประหยัด 10-30%)
3. **Compress HTML** - Gas: ~900,000-1,200,000 (ประหยัด 20-40%)
4. **PNG Base64** - Gas: ~200,000-300,000 (ประหยัด 80-87%)

**แนะนำ:** ใช้ IPFS Hash สำหรับ production (ประหยัดที่สุดและ Basescan แสดงได้ 100%)

