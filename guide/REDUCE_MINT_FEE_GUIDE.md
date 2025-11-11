# Guide: ลด Mint Fee (Gas Cost)

## สาเหตุที่ Mint Fee สูง

### ปัญหาหลัก: On-Chain Storage ของ Base64

Contract เก็บ PNG/JPEG base64 **ทั้งหมด** ใน contract metadata ซึ่งใช้ gas มาก:
- Base64 string ขนาดใหญ่ (อาจ 50-200 KB)
- การเก็บ string ใน Solidity ใช้ gas มาก (1 byte ≈ 16 gas)
- ตัวอย่าง: 100 KB base64 = ~1,600,000 gas units

### วิธีแก้ไข (เรียงตามประสิทธิภาพ)

## ✅ วิธีที่ 1: ใช้ IPFS แทน Base64 (แนะนำ)

**ข้อดี:**
- Gas fee ต่ำมาก (เก็บแค่ IPFS hash ~46 bytes)
- ไฟล์ใหญ่ได้ ไม่จำกัด
- Decentralized storage

**ข้อเสีย:**
- ต้องมี Pinata account
- ต้อง upload ก่อน mint

### Implementation

#### 1. Frontend: Upload to Pinata ก่อน Mint

```typescript
// app/mint/page.tsx
const handleMint = async () => {
  // Step 1: Upload image to Pinata
  const uploadResponse = await fetch("/api/upload-pinata", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageBase64,
      tokenId: fid,
      fid,
    }),
  });

  const uploadData = await uploadResponse.json();
  const ipfsHash = uploadData.image?.ipfsHash; // e.g., "QmXxxx..."

  // Step 2: Mint with IPFS hash
  writeContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: contractABI,
    functionName: "mintForFid",
    args: [address, BigInt(fid), `ipfs://${ipfsHash}`], // ส่ง IPFS hash
  });
};
```

#### 2. Contract: รับ IPFS Hash

```solidity
// DEPLOY_CONTRACT.sol
function mintForFid(
    address to, 
    uint256 fid,
    string memory imageData // IPFS hash หรือ base64
) external {
    // ...
    
    bool isIpfsHash = _isIpfsHash(imageData);
    
    string memory imageDataUri;
    if (isIpfsHash) {
        // ใช้ IPFS hash (gas ต่ำมาก)
        imageDataUri = imageData; // "ipfs://QmXxxx..."
    } else {
        // Fallback: ใช้ base64 (gas สูง)
        imageDataUri = string(abi.encodePacked("data:image/jpeg;base64,", imageData));
    }
    
    // ...
}
```

**Gas Cost:**
- IPFS hash: ~100,000 - 150,000 gas
- Base64 (100 KB): ~1,500,000 - 2,000,000 gas

**ประหยัด: ~90-95%**

---

## ✅ วิธีที่ 2: ลดขนาด Base64

### 2.1 ลด JPEG Quality

```typescript
// app/mint/page.tsx
// เปลี่ยนจาก 0.85 เป็น 0.7 หรือ 0.6
const base64 = canvasRef.current.toDataURL("image/jpeg", 0.6); // ลด quality
```

**ผลลัพธ์:**
- Quality 0.85: ~80-120 KB
- Quality 0.6: ~40-60 KB
- Gas ลดลง: ~40-50%

### 2.2 ลด Canvas Resolution

```typescript
// app/mint/page.tsx
// เปลี่ยนจาก 600x600 เป็น 400x400 หรือ 300x300
canvasRef.current.width = 400;
canvasRef.current.height = 400;
generateArt(canvasRef.current, { tokenId: fid });
```

**ผลลัพธ์:**
- 600x600: ~100 KB
- 400x400: ~50 KB
- 300x300: ~30 KB
- Gas ลดลง: ~50-70%

### 2.3 ใช้ WebP Format (ถ้า browser รองรับ)

```typescript
// app/mint/page.tsx
const base64 = canvasRef.current.toDataURL("image/webp", 0.6);
```

**ผลลัพธ์:**
- WebP มี compression ดีกว่า JPEG
- ขนาดไฟล์เล็กลง ~20-30%

---

## ✅ วิธีที่ 3: ใช้ Compression Library

### ใช้ browser-image-compression

```bash
npm install browser-image-compression
```

```typescript
// app/mint/page.tsx
import imageCompression from 'browser-image-compression';

const handleMint = async () => {
  // Generate canvas
  const canvas = canvasRef.current;
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.6);
  });

  // Compress further
  const compressedBlob = await imageCompression(blob, {
    maxSizeMB: 0.1, // 100 KB max
    maxWidthOrHeight: 400,
    useWebWorker: true,
  });

  // Convert to base64
  const reader = new FileReader();
  reader.onloadend = () => {
    const base64 = reader.result as string;
    const base64Only = base64.replace(/^data:image\/jpeg;base64,/, "");
    // Mint with compressed base64
  };
  reader.readAsDataURL(compressedBlob);
};
```

---

## ✅ วิธีที่ 4: Hybrid Approach (แนะนำที่สุด)

**เก็บ IPFS hash เป็นหลัก, base64 เป็น fallback**

```typescript
// app/mint/page.tsx
const handleMint = async () => {
  try {
    // Step 1: พยายาม upload ไป Pinata ก่อน
    const uploadResponse = await fetch("/api/upload-pinata", {
      method: "POST",
      body: JSON.stringify({ imageBase64, tokenId: fid, fid }),
    });

    if (uploadResponse.ok) {
      const { image } = await uploadResponse.json();
      const ipfsHash = image.ipfsHash;
      
      // ใช้ IPFS hash (gas ต่ำ)
      writeContract({
        args: [address, BigInt(fid), `ipfs://${ipfsHash}`],
      });
    } else {
      // Fallback: ใช้ base64 (gas สูง แต่ยัง mint ได้)
      const compressedBase64 = await compressImage(imageBase64);
      writeContract({
        args: [address, BigInt(fid), compressedBase64],
      });
    }
  } catch (error) {
    // Fallback to compressed base64
    const compressedBase64 = await compressImage(imageBase64);
    writeContract({
      args: [address, BigInt(fid), compressedBase64],
    });
  }
};
```

---

## สรุป Gas Cost

| Method | Base64 Size | Gas Cost | Savings |
|--------|-------------|----------|---------|
| **Original (JPEG 0.85, 600x600)** | ~100 KB | ~1,800,000 | - |
| **Reduce Quality (0.6)** | ~50 KB | ~900,000 | 50% |
| **Reduce Resolution (400x400)** | ~50 KB | ~900,000 | 50% |
| **Both (0.6 + 400x400)** | ~30 KB | ~550,000 | 70% |
| **IPFS Hash** | ~46 bytes | ~120,000 | **93%** |

---

## คำแนะนำ

### สำหรับ Production (แนะนำ)

1. **ใช้ IPFS** - Gas ต่ำสุด, scalable
2. **ตั้งค่า Pinata** - Free tier พอใช้
3. **Fallback to compressed base64** - ถ้า Pinata ล้มเหลว

### สำหรับ Development/Testing

1. **ลด quality เป็น 0.6**
2. **ลด resolution เป็น 400x400**
3. **ใช้ base64** - ไม่ต้อง setup Pinata

---

## Implementation Steps

### Step 1: ลด Base64 Size (Quick Fix)

```typescript
// app/mint/page.tsx - Line 632
const base64 = canvasRef.current.toDataURL("image/jpeg", 0.6); // เปลี่ยนจาก 0.85
```

### Step 2: ใช้ IPFS (Best Solution)

1. Setup Pinata account
2. Add `PINATA_JWT` to Vercel env
3. Update frontend to use IPFS hash
4. Contract already supports IPFS hash

---

## ตรวจสอบ Gas Cost

### ใช้ Basescan Gas Tracker

1. ไปที่ Basescan
2. ดู transaction details
3. ดู "Gas Used" และ "Gas Price"
4. คำนวณ: `Gas Used × Gas Price = Total Cost`

### ตัวอย่าง

- Gas Used: 1,800,000
- Gas Price: 0.0000001 ETH (0.1 gwei)
- **Total Cost: 0.00018 ETH** (~$0.05)

---

## หมายเหตุ

- Base64 on-chain = **Expensive** (แต่ Basescan compatible 100%)
- IPFS = **Cheap** (แต่ต้องพึ่ง Pinata)
- Hybrid = **Best of both worlds**

