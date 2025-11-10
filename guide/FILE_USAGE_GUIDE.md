# คู่มือการใช้ไฟล์ p5-art-generator.ts และ generate-html-canvas.ts

## สรุป

**ทั้งสองไฟล์ต้องใช้ร่วมกัน** แต่มีหน้าที่ต่างกัน:

### 1. `lib/p5-art-generator.ts` (Canvas API)
- **ใช้สำหรับ:** Generate art บน HTML Canvas element
- **ใช้ที่ไหน:**
  - ✅ Mint page preview (9 previews)
  - ✅ NFT view page (แสดง NFT)
  - ✅ Gallery page (แสดง NFT list)
  - ✅ Server-side image generation (`/api/nft-image/[tokenId]`)

### 2. `lib/generate-html-canvas.ts` (HTML + p5.js)
- **ใช้สำหรับ:** Generate HTML string ที่มี p5.js code สำหรับ embed ใน NFT metadata
- **ใช้ที่ไหน:**
  - ✅ Mint NFT (ส่ง HTML base64 ไปยัง contract)
  - ✅ Contract metadata (เก็บ HTML base64 ใน tokenURI)

---

## การใช้งานในแต่ละส่วน

### 📄 Mint Page (`app/mint/page.tsx`)

**ใช้ `p5-art-generator.ts`:**
```typescript
import { generateArt } from "../../lib/p5-art-generator";

// Generate 9 previews
generateArt(canvas, { tokenId: seed.toString() });

// Convert to base64 for upload
const base64 = canvas.toDataURL("image/png");
```

**ใช้ `generate-html-canvas.ts` (ผ่าน API):**
```typescript
// Generate HTML canvas base64 for contract
const htmlCanvasResponse = await fetch(`/api/generate-html-canvas?fid=${fid}`);
const htmlCanvasData = await htmlCanvasResponse.json();
const htmlCanvasBase64 = htmlCanvasData.htmlBase64;

// Send to contract
writeContract({
  args: [address, BigInt(fid), htmlCanvasBase64],
});
```

---

### 📄 NFT View Page (`app/mint/[tokenId]/NFTViewClient.tsx`)

**ใช้ `p5-art-generator.ts` (ผ่าน ArtGenerator component):**
```typescript
<ArtGenerator tokenId={tokenId} width={600} height={600} />
```

**ArtGenerator component ใช้:**
```typescript
import { generateArt } from "../../lib/p5-art-generator";
generateArt(canvasRef.current, { tokenId });
```

---

### 📄 Gallery Page (`app/gallery/page.tsx`)

**ใช้ `p5-art-generator.ts`:**
```typescript
import { generateArt } from "../../lib/p5-art-generator";

function NFTGalleryItem({ nft }: { nft: NFT }) {
  useEffect(() => {
    if (canvasRef.current) {
      generateArt(canvasRef.current, { tokenId: nft.tokenId });
    }
  }, [nft.tokenId]);
}
```

---

### 📄 Server-side Image API (`app/api/nft-image/[tokenId]/route.ts`)

**ใช้ `p5-art-generator.ts`:**
```typescript
import { createCanvas } from "canvas";
import { generateArt } from "../../../../lib/p5-art-generator";

const canvas = createCanvas(600, 600);
generateArt(canvas as unknown as HTMLCanvasElement, { tokenId: tokenIdNum });
const buffer = canvas.toBuffer("image/png");
```

---

### 📄 HTML Canvas API (`app/api/generate-html-canvas/route.ts`)

**ใช้ `generate-html-canvas.ts`:**
```typescript
import { generateHTMLCanvasBase64 } from "../../../lib/generate-html-canvas";

const htmlBase64 = generateHTMLCanvasBase64({ tokenId: tokenId.trim() });
return NextResponse.json({ tokenId, htmlBase64, htmlDataUri: `data:text/html;base64,${htmlBase64}` });
```

---

## Flow การทำงาน

### เมื่อ Mint NFT:

```
1. User กรอก FID
   ↓
2. Mint page ใช้ p5-art-generator.ts
   - Generate 9 previews บน canvas
   - Convert canvas เป็น base64 PNG
   ↓
3. Upload base64 PNG ไปยัง Pinata IPFS
   ↓
4. Mint page เรียก /api/generate-html-canvas?fid=xxx
   - API ใช้ generate-html-canvas.ts
   - Generate HTML base64 จาก FID
   ↓
5. ส่ง HTML base64 ไปยัง contract
   - Contract เก็บ HTML base64 ใน tokenURI
```

### เมื่อแสดง NFT:

```
1. NFT View Page
   ↓
2. ใช้ p5-art-generator.ts (ผ่าน ArtGenerator)
   - Generate art บน canvas จาก tokenId
   - แสดงผลใน browser
```

---

## ความแตกต่าง

| คุณสมบัติ | `p5-art-generator.ts` | `generate-html-canvas.ts` |
|---------|----------------------|-------------------------|
| **Output** | Canvas element | HTML string |
| **Format** | Canvas API | p5.js code |
| **ใช้ที่** | Browser/Server (node-canvas) | NFT metadata (embed) |
| **Size** | เล็ก (code) | ใหญ่ (HTML + p5.js) |
| **Interactive** | ✅ (ใน browser) | ✅ (ใน browser) |
| **Deterministic** | ✅ (ใช้ tokenId/FID เป็น seed) | ✅ (ใช้ tokenId/FID เป็น seed) |

---

## สรุป

### ✅ ต้องใช้ทั้งสองไฟล์:

1. **`p5-art-generator.ts`** - สำหรับ:
   - Preview art
   - แสดง NFT
   - Server-side image generation

2. **`generate-html-canvas.ts`** - สำหรับ:
   - Mint NFT (ส่ง HTML base64 ไปยัง contract)
   - Contract metadata (เก็บ HTML base64)

### ⚠️ ข้อควรระวัง:

- **Art ต้องเหมือนกัน** - ทั้งสองไฟล์ใช้ seed เดียวกัน (FID/tokenId) เพื่อให้ art เหมือนกัน
- **Contract ใช้ HTML base64** - Contract เก็บ HTML base64 ใน tokenURI ไม่ใช่ PNG base64
- **Display ใช้ Canvas API** - การแสดงผลใช้ Canvas API เพราะเร็วกว่าและใช้ memory น้อยกว่า

---

## คำตอบสั้นๆ

**Q: ตอนนี้ต้องใช้ไฟล์ไหน mint?**

**A: ใช้ทั้งสองไฟล์:**
- **`p5-art-generator.ts`** - สำหรับ preview และแสดงผล
- **`generate-html-canvas.ts`** - สำหรับ mint (ส่ง HTML base64 ไปยัง contract)

