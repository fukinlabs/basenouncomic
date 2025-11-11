# Guide: การใช้ Supply Validation ใน p5-art-generator.ts

## 📊 ฟังก์ชันที่เพิ่มเข้ามา

### 1. `validateSupply()` - ตรวจสอบ Supply
```typescript
import { validateSupply, ArtConfig } from '@/lib/p5-art-generator';

const config: ArtConfig = {
  tokenId: '123',
  maxSupply: 12345,
  currentSupply: 1000,
};

const supplyInfo = validateSupply(config);
// Returns: { current: 1000, max: 12345, remaining: 11345, canMint: true }
```

### 2. `generateArtWithSupplyCheck()` - Generate Art พร้อมตรวจสอบ Supply
```typescript
import { generateArtWithSupplyCheck } from '@/lib/p5-art-generator';

const canvas = document.createElement('canvas');
canvas.width = 600;
canvas.height = 600;

const config: ArtConfig = {
  tokenId: '123',
  maxSupply: 12345,
  currentSupply: 1000,
};

try {
  generateArtWithSupplyCheck(canvas, config);
  // Art generated successfully
} catch (error) {
  // Error: Maximum supply reached: 12345 / 12345
  console.error(error);
}
```

### 3. `generateWebPWithSupplyCheck()` - Generate WebP พร้อมตรวจสอบ Supply
```typescript
import { generateWebPWithSupplyCheck } from '@/lib/p5-art-generator';

const config: ArtConfig = {
  tokenId: '123',
  maxSupply: 12345,
  currentSupply: 1000,
};

try {
  const dataUrl = await generateWebPWithSupplyCheck(config, 600);
  // WebP generated successfully
} catch (error) {
  // Error: Maximum supply reached
  console.error(error);
}
```

### 4. `generateWebPBase64WithSupplyCheck()` - Generate WebP Base64 พร้อมตรวจสอบ Supply
```typescript
import { generateWebPBase64WithSupplyCheck } from '@/lib/p5-art-generator';

const config: ArtConfig = {
  tokenId: '123',
  maxSupply: 12345,
  currentSupply: 1000,
};

try {
  const base64 = await generateWebPBase64WithSupplyCheck(config, 600);
  // WebP base64 generated successfully
} catch (error) {
  // Error: Maximum supply reached
  console.error(error);
}
```

---

## 🎯 ตัวอย่างการใช้งานใน Frontend

### ตัวอย่าง 1: ตรวจสอบ Supply ก่อน Generate Art

```typescript
// app/mint/page.tsx
import { validateSupply, generateArtWithSupplyCheck, ArtConfig } from '@/lib/p5-art-generator';
import { useReadContract } from 'wagmi';

const NFT_CONTRACT_ADDRESS = "0x...";
const MAX_SUPPLY = 12345;

export default function MintPage() {
  // Read current supply from contract
  const { data: currentSupply } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: contractAbi,
    functionName: 'totalSupply',
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleGenerateArt = () => {
    if (!canvasRef.current) return;

    const config: ArtConfig = {
      tokenId: fid.toString(),
      maxSupply: MAX_SUPPLY,
      currentSupply: Number(currentSupply || 0),
    };

    // Validate supply first
    const supplyInfo = validateSupply(config);
    if (!supplyInfo.canMint) {
      alert(`Maximum supply reached: ${supplyInfo.current} / ${supplyInfo.max}`);
      return;
    }

    // Generate art with supply check
    try {
      generateArtWithSupplyCheck(canvasRef.current, config);
      console.log(`Remaining supply: ${supplyInfo.remaining}`);
    } catch (error) {
      console.error('Error generating art:', error);
      alert('Maximum supply reached!');
    }
  };

  return (
    <div>
      <canvas ref={canvasRef} width={600} height={600} />
      <button onClick={handleGenerateArt}>Generate Art</button>
      {currentSupply !== undefined && (
        <p>Supply: {Number(currentSupply)} / {MAX_SUPPLY}</p>
      )}
    </div>
  );
}
```

### ตัวอย่าง 2: ตรวจสอบ Supply ก่อน Mint

```typescript
// app/mint/page.tsx
import { generateWebPBase64WithSupplyCheck, validateSupply, ArtConfig } from '@/lib/p5-art-generator';
import { useReadContract, useWriteContract } from 'wagmi';

const NFT_CONTRACT_ADDRESS = "0x...";
const MAX_SUPPLY = 12345;

export default function MintPage() {
  const { data: currentSupply } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: contractAbi,
    functionName: 'totalSupply',
  });

  const { writeContract } = useWriteContract();

  const handleMint = async () => {
    try {
      // Check supply before generating
      const config: ArtConfig = {
        tokenId: fid.toString(),
        maxSupply: MAX_SUPPLY,
        currentSupply: Number(currentSupply || 0),
      };

      const supplyInfo = validateSupply(config);
      if (!supplyInfo.canMint) {
        alert(`Maximum supply reached: ${supplyInfo.current} / ${supplyInfo.max}`);
        return;
      }

      // Generate WebP with supply check
      const webpBase64 = await generateWebPBase64WithSupplyCheck(config, 600);

      // Mint NFT
      await writeContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: contractAbi,
        functionName: 'mintForFid',
        args: [address, BigInt(fid), webpBase64],
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Maximum supply reached')) {
        alert('Maximum supply reached! Cannot mint more NFTs.');
      } else {
        console.error('Error minting:', error);
      }
    }
  };

  return (
    <div>
      {currentSupply !== undefined && (
        <div>
          <p>Current Supply: {Number(currentSupply)}</p>
          <p>Max Supply: {MAX_SUPPLY}</p>
          <p>Remaining: {MAX_SUPPLY - Number(currentSupply)}</p>
        </div>
      )}
      <button onClick={handleMint} disabled={!supplyInfo?.canMint}>
        Mint NFT
      </button>
    </div>
  );
}
```

### ตัวอย่าง 3: แสดง Supply Status

```typescript
// app/mint/page.tsx
import { validateSupply, ArtConfig } from '@/lib/p5-art-generator';
import { useReadContract } from 'wagmi';

const NFT_CONTRACT_ADDRESS = "0x...";
const MAX_SUPPLY = 12345;

export default function MintPage() {
  const { data: currentSupply } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: contractAbi,
    functionName: 'totalSupply',
  });

  const { data: remainingSupply } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: contractAbi,
    functionName: 'remainingSupply',
  });

  const config: ArtConfig = {
    tokenId: fid.toString(),
    maxSupply: MAX_SUPPLY,
    currentSupply: Number(currentSupply || 0),
  };

  const supplyInfo = validateSupply(config);

  return (
    <div>
      <div className="supply-status">
        <h3>Supply Status</h3>
        <p>Current: {supplyInfo.current}</p>
        <p>Max: {supplyInfo.max}</p>
        <p>Remaining: {supplyInfo.remaining}</p>
        <p>Can Mint: {supplyInfo.canMint ? '✅ Yes' : '❌ No'}</p>
      </div>

      {!supplyInfo.canMint && (
        <div className="alert">
          ⚠️ Maximum supply reached! Cannot mint more NFTs.
        </div>
      )}

      <button disabled={!supplyInfo.canMint}>
        Mint NFT
      </button>
    </div>
  );
}
```

---

## 📊 SupplyInfo Interface

```typescript
export interface SupplyInfo {
  current: number;      // Current supply
  max: number;          // Maximum supply
  remaining: number;    // Remaining supply
  canMint: boolean;     // Can mint or not
}
```

---

## 🎯 ArtConfig Interface (Updated)

```typescript
export interface ArtConfig {
  tokenId: string;          // Required: Token ID / FID
  seed?: number;             // Optional: Custom seed
  maxSupply?: number;        // Optional: Maximum supply limit
  currentSupply?: number;    // Optional: Current supply
}
```

---

## ✅ ตัวอย่างการใช้งาน

### Basic Usage (ไม่ตรวจสอบ Supply)
```typescript
// ใช้ฟังก์ชันเดิม (ไม่ตรวจสอบ supply)
generateArt(canvas, { tokenId: '123' });
generateWebP({ tokenId: '123' }, 600);
```

### With Supply Check
```typescript
// ใช้ฟังก์ชันใหม่ (ตรวจสอบ supply)
generateArtWithSupplyCheck(canvas, {
  tokenId: '123',
  maxSupply: 12345,
  currentSupply: 1000,
});

generateWebPBase64WithSupplyCheck({
  tokenId: '123',
  maxSupply: 12345,
  currentSupply: 1000,
}, 600);
```

### Manual Validation
```typescript
// ตรวจสอบ supply ก่อน generate
const supplyInfo = validateSupply({
  tokenId: '123',
  maxSupply: 12345,
  currentSupply: 1000,
});

if (supplyInfo.canMint) {
  generateArt(canvas, { tokenId: '123' });
} else {
  alert('Maximum supply reached!');
}
```

---

## ⚠️ ข้อควรระวัง

### 1. Supply Data Source
- ⚠️ `currentSupply` ต้องอ่านจาก smart contract
- ✅ ใช้ `useReadContract` หรือ `readContract` จาก wagmi
- ✅ ใช้ `totalSupply()` function จาก contract

### 2. Race Condition
- ⚠️ Supply อาจเปลี่ยนระหว่าง validate และ mint
- ✅ Contract จะ reject mint ถ้าเกิน supply limit
- ✅ Frontend validation เป็นแค่ UX improvement

### 3. Optional Parameters
- ✅ `maxSupply` และ `currentSupply` เป็น optional
- ✅ ถ้าไม่ระบุ จะไม่ตรวจสอบ supply
- ✅ ใช้ฟังก์ชันเดิมได้ตามปกติ

---

## 🔧 Integration with Contract

### Read Supply from Contract

```typescript
// Using wagmi
import { useReadContract } from 'wagmi';

const { data: currentSupply } = useReadContract({
  address: NFT_CONTRACT_ADDRESS,
  abi: contractAbi,
  functionName: 'totalSupply',
});

const { data: remainingSupply } = useReadContract({
  address: NFT_CONTRACT_ADDRESS,
  abi: contractAbi,
  functionName: 'remainingSupply',
});

// Use in ArtConfig
const config: ArtConfig = {
  tokenId: fid.toString(),
  maxSupply: 12345, // From contract: MAX_SUPPLY
  currentSupply: Number(currentSupply || 0),
};
```

---

## ✅ Checklist

- [x] เพิ่ม `maxSupply` และ `currentSupply` ใน `ArtConfig`
- [x] เพิ่ม `SupplyInfo` interface
- [x] เพิ่ม `validateSupply()` function
- [x] เพิ่ม `generateArtWithSupplyCheck()` function
- [x] เพิ่ม `generateWebPWithSupplyCheck()` function
- [x] เพิ่ม `generateWebPBase64WithSupplyCheck()` function

---

## 📝 Summary

**ฟังก์ชันใหม่:**
1. `validateSupply()` - ตรวจสอบ supply
2. `generateArtWithSupplyCheck()` - Generate art พร้อมตรวจสอบ supply
3. `generateWebPWithSupplyCheck()` - Generate WebP พร้อมตรวจสอบ supply
4. `generateWebPBase64WithSupplyCheck()` - Generate WebP base64 พร้อมตรวจสอบ supply

**การใช้งาน:**
- ✅ ฟังก์ชันเดิมยังใช้ได้ตามปกติ (ไม่ตรวจสอบ supply)
- ✅ ฟังก์ชันใหม่ตรวจสอบ supply ก่อน generate
- ✅ Throw error ถ้า supply limit ถึง

