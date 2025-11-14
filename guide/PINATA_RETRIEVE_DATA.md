# คู่มือการดึงข้อมูลจาก Pinata IPFS

## 📋 ภาพรวม

Pinata IPFS เก็บข้อมูลในรูปแบบ decentralized และสามารถดึงข้อมูลได้หลายวิธี:

1. **Pinata Gateway** (แนะนำ) - ใช้ HTTP URL
2. **Pinata API** - ใช้ Pinata API เพื่อดึงข้อมูล
3. **IPFS Gateway อื่นๆ** - ใช้ gateway อื่นๆ เช่น ipfs.io, cloudflare-ipfs.com

---

## 🌐 วิธีที่ 1: ใช้ Pinata Gateway (แนะนำ)

### หลักการ
- ใช้ HTTP URL เพื่อดึงข้อมูลจาก Pinata Gateway
- ไม่ต้องใช้ API credentials
- เร็วและง่าย

### รูปแบบ URL
```
https://gateway.pinata.cloud/ipfs/{IPFS_HASH}
```

### ตัวอย่างโค้ด

#### 1. ดึงข้อมูล Image จาก IPFS Hash

```typescript
// ถ้ามี IPFS hash (เช่น "QmXxxx...")
const ipfsHash = "QmXxxx...";

// แปลงเป็น Pinata Gateway URL
const imageUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

// ดึงข้อมูล
const response = await fetch(imageUrl);
const imageBlob = await response.blob();

// ใช้ใน <img> tag
<img src={imageUrl} alt="NFT Image" />
```

#### 2. ดึงข้อมูล Metadata JSON จาก IPFS Hash

```typescript
// ถ้ามี IPFS hash สำหรับ metadata
const metadataHash = "QmYyyy...";

// แปลงเป็น Pinata Gateway URL
const metadataUrl = `https://gateway.pinata.cloud/ipfs/${metadataHash}`;

// ดึงข้อมูล
const response = await fetch(metadataUrl);
const metadata = await response.json();

console.log(metadata);
// Output: { name: "...", description: "...", image: "...", attributes: [...] }
```

#### 3. ดึงข้อมูลจาก IPFS Protocol URL

```typescript
// ถ้ามี IPFS protocol URL (เช่น "ipfs://QmXxxx...")
const ipfsUrl = "ipfs://QmXxxx...";

// แปลงเป็น HTTP URL
let httpUrl = ipfsUrl;
if (ipfsUrl.startsWith("ipfs://")) {
  const ipfsHash = ipfsUrl.replace("ipfs://", "");
  httpUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
}

// ดึงข้อมูล
const response = await fetch(httpUrl);
const data = await response.json();
```

---

## 🔑 วิธีที่ 2: ใช้ Pinata API

### หลักการ
- ใช้ Pinata API เพื่อดึงข้อมูล
- ต้องใช้ API credentials
- เหมาะสำหรับการจัดการข้อมูลที่ซับซ้อน

### ตัวอย่างโค้ด

#### 1. ดึงข้อมูล File จาก Pinata API

```typescript
// ตั้งค่า API credentials
const pinataJWT = process.env.PINATA_JWT;
// หรือ
const pinataApiKey = process.env.PINATA_API_KEY;
const pinataSecretKey = process.env.PINATA_SECRET_API_KEY;

// ใช้ JWT Token (แนะนำ)
const headers = {
  Authorization: `Bearer ${pinataJWT}`,
};

// หรือใช้ API Key + Secret
const headers = {
  pinata_api_key: pinataApiKey,
  pinata_secret_api_key: pinataSecretKey,
};

// ดึงข้อมูล file จาก IPFS hash
const ipfsHash = "QmXxxx...";
const response = await fetch(
  `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
  { headers }
);

const data = await response.json();
```

#### 2. ดูรายการ Files ที่ pin ไว้

```typescript
const pinataJWT = process.env.PINATA_JWT;

const response = await fetch(
  "https://api.pinata.cloud/data/pinList",
  {
    method: "GET",
    headers: {
      Authorization: `Bearer ${pinataJWT}`,
    },
  }
);

const data = await response.json();
console.log(data.rows); // Array of pinned files
```

#### 3. ดูข้อมูล File โดย IPFS Hash

```typescript
const pinataJWT = process.env.PINATA_JWT;
const ipfsHash = "QmXxxx...";

const response = await fetch(
  `https://api.pinata.cloud/data/pinList?hashContains=${ipfsHash}`,
  {
    method: "GET",
    headers: {
      Authorization: `Bearer ${pinataJWT}`,
    },
  }
);

const data = await response.json();
console.log(data.rows); // File information
```

---

## 📝 ตัวอย่างการใช้งานจริง

### ตัวอย่าง 1: ดึง NFT Image จาก Contract

```typescript
// app/api/nft-image/[tokenId]/route.ts
export async function GET(request: NextRequest, { params }: { params: { tokenId: string } }) {
  const { tokenId } = params;
  
  // 1. ดึง tokenURI จาก contract
  const tokenURI = await publicClient.readContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: contractABI,
    functionName: "tokenURI",
    args: [BigInt(tokenId)],
  });
  
  // 2. แปลง IPFS URL เป็น HTTP URL
  let imageUrl = tokenURI;
  if (tokenURI.startsWith("ipfs://")) {
    const ipfsHash = tokenURI.replace("ipfs://", "");
    imageUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
  }
  
  // 3. ดึงข้อมูล image
  const response = await fetch(imageUrl);
  const imageBuffer = await response.arrayBuffer();
  
  return new Response(imageBuffer, {
    headers: {
      "Content-Type": "image/png",
    },
  });
}
```

### ตัวอย่าง 2: ดึง NFT Metadata จาก Contract

```typescript
// app/api/nft-metadata/route.ts
export async function GET(request: NextRequest) {
  const tokenId = request.nextUrl.searchParams.get("tokenId");
  
  // 1. ดึง tokenURI จาก contract
  const tokenURI = await publicClient.readContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: contractABI,
    functionName: "tokenURI",
    args: [BigInt(tokenId)],
  });
  
  // 2. แปลง IPFS URL เป็น HTTP URL
  let metadataUrl = tokenURI;
  if (tokenURI.startsWith("ipfs://")) {
    const ipfsHash = tokenURI.replace("ipfs://", "");
    metadataUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
  }
  
  // 3. ดึงข้อมูล metadata
  const response = await fetch(metadataUrl);
  const metadata = await response.json();
  
  // 4. แปลง image URL ใน metadata เป็น HTTP URL
  if (metadata.image?.startsWith("ipfs://")) {
    const imageHash = metadata.image.replace("ipfs://", "");
    metadata.image = `https://gateway.pinata.cloud/ipfs/${imageHash}`;
  }
  
  return NextResponse.json(metadata);
}
```

### ตัวอย่าง 3: ดึงข้อมูลใน Frontend (React)

```typescript
// components/NFTImage.tsx
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export function NFTImage({ ipfsHash }: { ipfsHash: string }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchImage = async () => {
      try {
        // แปลง IPFS hash เป็น Pinata Gateway URL
        const url = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
        
        // ตรวจสอบว่า image โหลดได้หรือไม่
        const response = await fetch(url, { method: "HEAD" });
        if (response.ok) {
          setImageUrl(url);
        } else {
          throw new Error("Image not found");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load image");
      } finally {
        setLoading(false);
      }
    };

    fetchImage();
  }, [ipfsHash]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!imageUrl) return null;

  return (
    <Image
      src={imageUrl}
      alt="NFT Image"
      width={600}
      height={600}
      unoptimized
    />
  );
}
```

---

## 🔄 IPFS Gateway อื่นๆ (Fallback)

ถ้า Pinata Gateway ไม่ทำงาน สามารถใช้ gateway อื่นๆ ได้:

```typescript
const ipfsHash = "QmXxxx...";

// Pinata Gateway (แนะนำ)
const pinataUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

// IPFS.io Gateway
const ipfsIoUrl = `https://ipfs.io/ipfs/${ipfsHash}`;

// Cloudflare IPFS Gateway
const cloudflareUrl = `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`;

// NFT.Storage Gateway
const nftStorageUrl = `https://nftstorage.link/ipfs/${ipfsHash}`;

// ใช้ fallback ถ้า gateway แรกล้มเหลว
async function fetchWithFallback(ipfsHash: string) {
  const gateways = [
    `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
    `https://ipfs.io/ipfs/${ipfsHash}`,
    `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
  ];

  for (const url of gateways) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn(`Gateway ${url} failed, trying next...`);
      continue;
    }
  }

  throw new Error("All gateways failed");
}
```

---

## 📊 สรุป

| วิธี | ข้อดี | ข้อเสีย | ใช้เมื่อ |
|------|-------|---------|---------|
| **Pinata Gateway** | เร็ว, ง่าย, ไม่ต้องใช้ API | ต้องพึ่งพา Pinata | ✅ **แนะนำ** สำหรับการดึงข้อมูลทั่วไป |
| **Pinata API** | จัดการข้อมูลได้ละเอียด | ต้องใช้ API credentials | ใช้เมื่อต้องการจัดการข้อมูลที่ซับซ้อน |
| **IPFS Gateway อื่นๆ** | ไม่ต้องพึ่งพา Pinata | อาจช้ากว่า | ใช้เป็น fallback |

---

## 🔗 เอกสารอ้างอิง

- [Pinata Documentation](https://docs.pinata.cloud/)
- [Pinata Gateway](https://docs.pinata.cloud/gateways)
- [Pinata API Reference](https://docs.pinata.cloud/api-reference)

