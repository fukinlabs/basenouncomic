# คู่มือการ Mint NFT พร้อม Generative Art (P5.js)

## ภาพรวม

ระบบนี้แปลงโค้ด P5.js เป็น Canvas API เพื่อสร้าง generative art สำหรับ NFT และแปลงเป็น base64 สำหรับ mint ลงบน Base blockchain

## โครงสร้างไฟล์

```
lib/
└── p5-art-generator.ts      # โค้ดแปลง P5.js เป็น Canvas API

app/
├── components/
│   └── ArtGenerator.tsx    # Component สำหรับ render art และสร้าง base64
├── api/
│   └── generate-art/
│       └── route.ts        # API endpoint สำหรับรับ base64
└── mint/
    ├── page.tsx            # หน้า mint NFT
    └── [tokenId]/
        ├── page.tsx        # หน้าแสดง NFT (server component)
        └── NFTViewClient.tsx # Client component สำหรับแสดง art
```

## วิธีการทำงาน

### 1. การแปลง P5.js เป็น Canvas API

โค้ด P5.js ถูกแปลงเป็น Canvas API ใน `lib/p5-art-generator.ts`:

- **SeededRandom**: ใช้ tokenId เป็น seed เพื่อให้ art ที่สร้างขึ้น deterministic (เหมือนกันทุกครั้งสำหรับ tokenId เดียวกัน)
- **Shape Class**: แปลงจาก P5.js Shape class เป็น Canvas API
- **generateArt Function**: ฟังก์ชันหลักที่รับ canvas และ config แล้ววาด art

### 2. Art Generator Component

`ArtGenerator` component:
- Render art บน HTML Canvas
- แปลง canvas เป็น base64 PNG image
- แสดง base64 string ให้ผู้ใช้ copy

### 3. การ Mint NFT

1. ผู้ใช้ไปที่ `/mint`
2. เชื่อมต่อ wallet
3. ใส่ Farcaster FID
4. กด "Mint NFT"
5. หลังจาก mint สำเร็จ จะได้ tokenId
6. ไปที่ `/mint/[tokenId]` เพื่อดู art ที่สร้างจาก tokenId

## การใช้งาน Base64

### วิธีที่ 1: Copy จาก ArtGenerator Component

1. ไปที่ `/mint/[tokenId]`
2. Component จะแสดง art และ base64
3. Click "View Base64" เพื่อดู base64 string
4. Copy base64 string

### วิธีที่ 2: ใช้ API Endpoint

```typescript
// GET /api/generate-art?tokenId=123&format=base64
const response = await fetch('/api/generate-art?tokenId=123&format=base64');
const data = await response.json();
const base64 = data.base64; // data:image/svg+xml;base64,...
```

### วิธีที่ 3: ใช้ POST Endpoint

```typescript
// ส่ง base64 ที่สร้างจาก client-side
const response = await fetch('/api/generate-art', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ imageData: base64String })
});
```

## การใช้ Base64 กับ Smart Contract

เมื่อได้ base64 แล้ว สามารถใช้กับ smart contract ได้:

```solidity
// ใน smart contract
string memory base64Image = "data:image/png;base64,iVBORw0KGgo...";
// ใช้ใน tokenURI หรือ metadata
```

หรือใน JavaScript/TypeScript:

```typescript
// ส่ง base64 ไปยัง smart contract
const base64 = "data:image/png;base64,iVBORw0KGgo...";
// ใช้ใน transaction หรือ metadata
```

## คุณสมบัติ

### Deterministic Generation
- ใช้ tokenId เป็น seed
- Art ที่สร้างจาก tokenId เดียวกันจะเหมือนกันทุกครั้ง
- ไม่ต้องเก็บ image ใน database

### 9 รูปแบบ Art (Forms 0-8)
- Form 0: Leaf + Circle
- Form 1: Cross + Circle
- Form 2: Squares + Rounded Rect
- Form 3: Grid of Circles
- Form 4: 6 Circles around Center
- Form 5: Rounded Square + Circle
- Form 6: 6-Petal Flower
- Form 7: Sun Pattern
- Form 8: Noggles (Red Frame Glasses)

### สีที่ใช้
```typescript
const colors = [
  '#0000FF', // Blue
  '#FF0000', // Red
  '#ff6392', // Pink
  '#FCBA3A', // Yellow
  '#000000', // Black
  '#f0f0f0'  // Light Gray
];
```

## ตัวอย่างการใช้งาน

### ในหน้า Mint

```tsx
import ArtGenerator from "../components/ArtGenerator";

export default function MintPage() {
  const [base64, setBase64] = useState<string>("");
  
  return (
    <div>
      <ArtGenerator 
        tokenId="123" 
        onBase64Generated={(b64) => setBase64(b64)}
      />
      {base64 && <p>Base64 ready!</p>}
    </div>
  );
}
```

### ส่ง Base64 ไปยัง API

```typescript
const handleMint = async () => {
  // สร้าง art และได้ base64
  const base64 = await generateArtBase64(tokenId);
  
  // ส่งไปยัง smart contract หรือ API
  await mintNFT({
    tokenId,
    imageBase64: base64
  });
};
```

## หมายเหตุ

1. **Client-Side Rendering**: Art ถูก render บน client-side ใช้ HTML Canvas API
2. **Base64 Format**: ใช้ format `data:image/png;base64,...`
3. **Size**: Canvas ขนาด 600x600 pixels
4. **Deterministic**: ใช้ seeded random เพื่อให้ผลลัพธ์เหมือนกันทุกครั้ง

## การปรับแต่ง

### เปลี่ยนสี

แก้ไขใน `lib/p5-art-generator.ts`:

```typescript
const colors = ['#YOUR_COLOR_1', '#YOUR_COLOR_2', ...];
```

### เพิ่มรูปแบบใหม่

เพิ่มใน `Shape.show()` method:

```typescript
} else if (this.form === 9) {
  // Your new form code
}
```

### เปลี่ยนขนาด Canvas

แก้ไขใน `generateArt()` function:

```typescript
const width = 1200; // เปลี่ยนตามต้องการ
const height = 1200;
```

## Troubleshooting

### Art ไม่แสดง
- ตรวจสอบว่า canvas ref ถูกต้อง
- ตรวจสอบ console สำหรับ errors

### Base64 ไม่ถูกสร้าง
- ตรวจสอบว่า canvas.toDataURL() ทำงานได้
- ตรวจสอบว่า component mount แล้ว

### Art ไม่เหมือนกันทุกครั้ง
- ตรวจสอบว่าใช้ seeded random ถูกต้อง
- ตรวจสอบว่า tokenId ถูกส่งมาถูกต้อง

