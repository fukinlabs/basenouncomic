# Guide: การใช้ generateWebP จาก p5-art-generator.ts

## 📊 ฟังก์ชันที่เพิ่มเข้ามา

### 1. `generateWebP()` - Browser (Data URL)
```typescript
import { generateWebP } from '@/lib/p5-art-generator';

// Generate WebP 600x600 (default)
const dataUrl = await generateWebP({ tokenId: '123' });
// Returns: "data:image/webp;base64,..."

// Generate WebP custom size
const dataUrl = await generateWebP({ tokenId: '123' }, 800);
// Returns: "data:image/webp;base64,..." (800x800)
```

### 2. `generateWebPBase64()` - Browser (Base64 String)
```typescript
import { generateWebPBase64 } from '@/lib/p5-art-generator';

// Generate WebP base64 600x600 (default)
const base64 = await generateWebPBase64({ tokenId: '123' });
// Returns: "iVBORw0KGgoAAAANSUhEUgAA..." (without data URL prefix)

// Generate WebP base64 custom size
const base64 = await generateWebPBase64({ tokenId: '123' }, 800);
// Returns: "iVBORw0KGgoAAAANSUhEUgAA..." (800x800)
```

### 3. `generateWebPNode()` - Node.js/Server (Buffer)
```typescript
import { generateWebPNode } from '@/lib/p5-art-generator';

// Generate WebP buffer 600x600 (default)
const buffer = await generateWebPNode({ tokenId: '123' });
// Returns: Buffer

// Generate WebP buffer custom size
const buffer = await generateWebPNode({ tokenId: '123' }, 800);
// Returns: Buffer (800x800)
```

### 4. `generateWebPBase64Node()` - Node.js/Server (Base64 String)
```typescript
import { generateWebPBase64Node } from '@/lib/p5-art-generator';

// Generate WebP base64 600x600 (default)
const base64 = await generateWebPBase64Node({ tokenId: '123' });
// Returns: "iVBORw0KGgoAAAANSUhEUgAA..." (without data URL prefix)

// Generate WebP base64 custom size
const base64 = await generateWebPBase64Node({ tokenId: '123' }, 800);
// Returns: "iVBORw0KGgoAAAANSUhEUgAA..." (800x800)
```

---

## 🎯 ตัวอย่างการใช้งาน

### Browser (Frontend)

#### ตัวอย่าง 1: Generate WebP และแสดงใน `<img>`
```typescript
// app/mint/page.tsx
import { generateWebP } from '@/lib/p5-art-generator';

const handleGenerateWebP = async (tokenId: string) => {
  try {
    const dataUrl = await generateWebP({ tokenId }, 600);
    setImageSrc(dataUrl);
  } catch (error) {
    console.error('Error generating WebP:', error);
  }
};

// Usage
<img src={imageSrc} alt="NFT Art" />
```

#### ตัวอย่าง 2: Generate WebP และส่งไปยัง Smart Contract
```typescript
// app/mint/page.tsx
import { generateWebPBase64 } from '@/lib/p5-art-generator';

const handleMint = async () => {
  try {
    // Generate WebP base64 (600x600)
    const webpBase64 = await generateWebPBase64({ tokenId: fid.toString() }, 600);
    
    // Send to contract
    await writeContract({
      address: NFT_CONTRACT_ADDRESS,
      abi: contractAbi,
      functionName: 'mintForFid',
      args: [address, BigInt(fid), webpBase64],
    });
  } catch (error) {
    console.error('Error minting:', error);
  }
};
```

#### ตัวอย่าง 3: Generate WebP และ Upload ไปยัง IPFS
```typescript
// app/mint/page.tsx
import { generateWebPBase64 } from '@/lib/p5-art-generator';

const handleUploadToIPFS = async (tokenId: string) => {
  try {
    // Generate WebP base64 (600x600)
    const webpBase64 = await generateWebPBase64({ tokenId }, 600);
    
    // Upload to Pinata
    const response = await fetch('/api/upload-pinata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: webpBase64,
        tokenId,
        format: 'webp',
      }),
    });
    
    const { ipfsHash } = await response.json();
    return ipfsHash;
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
  }
};
```

---

### Node.js/Server (API Route)

#### ตัวอย่าง 1: API Route สำหรับ Generate WebP
```typescript
// app/api/nft-webp/[tokenId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateWebPNode } from '@/lib/p5-art-generator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  try {
    const { tokenId } = await params;
    
    // Generate WebP buffer (600x600)
    const buffer = await generateWebPNode({ tokenId }, 600);
    
    // Return as WebP image
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error generating WebP:', error);
    return NextResponse.json(
      { error: 'Failed to generate WebP' },
      { status: 500 }
    );
  }
}
```

#### ตัวอย่าง 2: API Route สำหรับ Generate WebP Base64
```typescript
// app/api/nft-webp-base64/[tokenId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateWebPBase64Node } from '@/lib/p5-art-generator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  try {
    const { tokenId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const size = parseInt(searchParams.get('size') || '600');
    
    // Generate WebP base64
    const base64 = await generateWebPBase64Node({ tokenId }, size);
    
    // Return as JSON
    return NextResponse.json({
      tokenId,
      size,
      format: 'webp',
      base64,
      dataUrl: `data:image/webp;base64,${base64}`,
    });
  } catch (error) {
    console.error('Error generating WebP base64:', error);
    return NextResponse.json(
      { error: 'Failed to generate WebP base64' },
      { status: 500 }
    );
  }
}
```

---

## 📊 เปรียบเทียบ: WebP vs PNG vs JPEG

| Format | Size (600x600) | Quality | Browser Support | Gas Cost |
|--------|----------------|---------|-----------------|----------|
| **WebP** | ~30-50 KB | 92% | ✅ Modern browsers | Medium |
| **PNG** | ~80-120 KB | 100% | ✅ All browsers | High |
| **JPEG** | ~40-70 KB | 85% | ✅ All browsers | Medium |

**WebP ข้อดี:**
- ✅ ขนาดไฟล์เล็กที่สุด (~30-50 KB)
- ✅ Quality สูง (92%)
- ✅ รองรับ transparency (เหมือน PNG)
- ✅ Compression ดีกว่า JPEG/PNG

**WebP ข้อเสีย:**
- ⚠️ ไม่รองรับ Internet Explorer
- ⚠️ Basescan อาจไม่แสดง WebP (ต้องตรวจสอบ)

---

## 🎯 คำแนะนำการใช้งาน

### สำหรับ Minting NFT:

**แนะนำ:** ใช้ WebP 600x600
```typescript
const webpBase64 = await generateWebPBase64({ tokenId: fid.toString() }, 600);
```

**ผลลัพธ์:**
- ✅ ขนาดไฟล์: ~30-50 KB (เล็กกว่า PNG ~60-70%)
- ✅ Gas cost: ~200,000-300,000 (ต่ำกว่า PNG)
- ✅ Quality: 92% (ดีมาก)

### สำหรับ Display:

**แนะนำ:** ใช้ WebP Data URL
```typescript
const dataUrl = await generateWebP({ tokenId: '123' }, 600);
<img src={dataUrl} alt="NFT Art" />
```

**ผลลัพธ์:**
- ✅ Load เร็ว (ไฟล์เล็ก)
- ✅ Quality สูง
- ✅ รองรับ modern browsers

---

## ⚠️ ข้อควรระวัง

### 1. Browser Support
- ✅ Chrome, Firefox, Edge, Opera (รองรับ)
- ✅ Safari 14+ (รองรับ)
- ❌ Internet Explorer (ไม่รองรับ)

### 2. Basescan Support
- ⚠️ Basescan อาจไม่แสดง WebP base64
- ✅ รองรับ PNG/JPEG base64 แน่นอน
- **แนะนำ:** ใช้ PNG สำหรับ minting (ถ้า Basescan ไม่รองรับ WebP)

### 3. Smart Contract
- ⚠️ Contract อาจไม่รองรับ WebP detection
- ✅ ยังทำงานได้ (treat เป็น PNG)
- **แนะนำ:** ตรวจสอบ contract code ก่อนใช้

---

## ✅ Checklist

- [x] เพิ่ม `generateWebP()` สำหรับ browser
- [x] เพิ่ม `generateWebPBase64()` สำหรับ browser
- [x] เพิ่ม `generateWebPNode()` สำหรับ Node.js
- [x] เพิ่ม `generateWebPBase64Node()` สำหรับ Node.js
- [x] รองรับ custom size (default: 600)
- [x] Quality: 0.92 (92%)

---

## 🔗 References

- [WebP Specification](https://developers.google.com/speed/webp)
- [Canvas toBlob API](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob)
- [Node Canvas WebP Support](https://github.com/Automattic/node-canvas#imageoutputformat)

