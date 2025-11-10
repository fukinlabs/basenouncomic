# HTML Canvas Generation Guide

## ภาพรวม

ระบบนี้ generate HTML canvas จาก p5-art-generator.ts และใช้ใน smart contract แทน HTML base64 ที่ hardcode ไว้

## การทำงาน

### 1. Frontend Generate HTML Canvas

เมื่อผู้ใช้ mint NFT:
1. Frontend เรียก API `/api/generate-html-canvas?fid=xxx`
2. API generate HTML canvas จาก FID (ใช้ FID เป็น seed)
3. API return HTML base64 string

### 2. Frontend ส่ง HTML Base64 ไปยัง Contract

```typescript
// app/mint/page.tsx
const htmlCanvasResponse = await fetch(`/api/generate-html-canvas?fid=${fid}`);
const htmlCanvasData = await htmlCanvasResponse.json();
const htmlCanvasBase64 = htmlCanvasData.htmlBase64;

writeContract({
  args: [address, BigInt(fid), htmlCanvasBase64], // ส่ง HTML base64
  value: mintCost,
});
```

### 3. Contract ใช้ HTML Base64

```solidity
// CONTRACT_COMPATIBILITY_FIX.sol
function mintForFid(
    address to, 
    uint256 fid,
    string memory htmlCanvasBase64  // HTML canvas base64 จาก frontend
) external payable {
    // ใช้ HTML base64 ที่ frontend ส่งมา หรือใช้ hardcode เป็น fallback
    string memory htmlBase64 = bytes(htmlCanvasBase64).length > 0 
        ? htmlCanvasBase64  // ใช้ HTML base64 ที่ frontend ส่งมา
        : HTML_SKETCH;      // Fallback: ใช้ HTML base64 ที่ hardcode ไว้
    
    // สร้าง JSON metadata
    string memory json = string(
        abi.encodePacked(
            '{"name":"BaseP5 #', _uint2str(fid),
            '", "description":"p5.js generated NFT bound to Farcaster FID ', _uint2str(fid),
            '","attributes":[{"trait_type":"FID","value":"', _uint2str(fid), '"}],',
            '"image":"data:text/html;base64,', htmlBase64, '"}'
        )
    );
}
```

## ไฟล์ที่เกี่ยวข้อง

### 1. `lib/generate-html-canvas.ts`

Function สำหรับ generate HTML canvas:
- `generateHTMLCanvas(config: ArtConfig): string` - Generate HTML string
- `generateHTMLCanvasBase64(config: ArtConfig): string` - Generate base64 encoded HTML

**การทำงาน:**
- ใช้ `tokenId`/`fid` เป็น seed
- Generate HTML ที่มี p5.js sketch
- HTML จะสร้าง art ที่เหมือนกับ `p5-art-generator.ts`

### 2. `app/api/generate-html-canvas/route.ts`

API endpoint สำหรับ generate HTML canvas:
- `GET /api/generate-html-canvas?fid=xxx` หรือ `?tokenId=xxx`
- Return: `{ tokenId, htmlBase64, htmlDataUri }`

### 3. `app/mint/page.tsx`

Frontend minting logic:
- เรียก `/api/generate-html-canvas?fid=xxx` ก่อน mint
- ส่ง HTML base64 ไปยัง contract

### 4. `CONTRACT_COMPATIBILITY_FIX.sol`

Smart contract:
- รับ HTML base64 จาก frontend
- ใช้ HTML base64 ที่ส่งมา หรือใช้ hardcode เป็น fallback
- สร้าง JSON metadata ด้วย HTML base64

## ข้อดี

1. **Deterministic Art** - ใช้ FID เป็น seed ทำให้ art เหมือนกันทุกครั้ง
2. **Interactive Canvas** - NFT เป็น interactive HTML canvas
3. **Flexible** - Frontend generate HTML จาก FID แทนที่จะ hardcode ใน contract
4. **Fallback** - ถ้า frontend ไม่ส่ง HTML base64 contract จะใช้ hardcode เป็น fallback

## ข้อเสีย

1. **Gas Cost สูง** - HTML base64 ยาวมาก ทำให้ tokenURI ยาว
2. **Contract Size** - HTML base64 ที่ hardcode ใช้ storage มาก

## วิธีทดสอบ

### 1. ทดสอบ API

```bash
curl "http://localhost:3000/api/generate-html-canvas?fid=123"
```

Response:
```json
{
  "tokenId": "123",
  "htmlBase64": "PHRtbWw+...",
  "htmlDataUri": "data:text/html;base64,PHRtbWw+..."
}
```

### 2. ทดสอบ Frontend

1. ไปที่ `/mint`
2. กรอก FID
3. Click "Mint NFT"
4. ตรวจสอบ console log:
   - "Generating HTML canvas from FID..."
   - "HTML canvas generated successfully"

### 3. ทดสอบ Contract

1. Mint NFT ด้วย FID
2. ตรวจสอบ `tokenURI` จาก contract
3. Decode base64 JSON metadata
4. ตรวจสอบ `image` field ว่าเป็น `data:text/html;base64,...`

## สรุป

ระบบนี้ generate HTML canvas จาก p5-art-generator.ts โดยใช้ FID เป็น seed และส่ง HTML base64 ไปยัง smart contract เพื่อใช้ใน NFT metadata

