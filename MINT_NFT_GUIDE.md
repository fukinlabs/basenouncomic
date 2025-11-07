# คู่มือการสร้างลิงก์ Mint NFT สำหรับ Farcaster Mini Apps

## ภาพรวม

ระบบนี้สร้างขึ้นตามเอกสาร [Farcaster Mini Apps Sharing Guide](https://miniapps.farcaster.xyz/docs/guides/sharing) เพื่อให้สามารถแชร์ลิงก์ mint NFT ใน Farcaster feeds ได้

## โครงสร้างไฟล์

```
app/
├── mint/
│   ├── page.tsx              # หน้า mint NFT หลัก
│   ├── layout.tsx            # Layout พร้อม embed meta tags
│   └── [tokenId]/
│       └── page.tsx           # หน้าแสดง NFT ที่ mint แล้ว (สำหรับแชร์)
└── api/
    └── og/
        └── route.ts          # API endpoint สำหรับสร้าง dynamic OG image
```

## วิธีการทำงาน

### 1. หน้า Mint NFT (`/mint`)

- ผู้ใช้เชื่อมต่อ wallet
- ใส่ Farcaster FID
- กดปุ่ม Mint NFT
- ระบบจะเรียก `mintForFid` function จาก smart contract
- หลังจาก mint สำเร็จ จะแสดงลิงก์ไปยังหน้า NFT

### 2. หน้าแสดง NFT (`/mint/[tokenId]`)

- หน้าแสดง NFT ที่ mint แล้ว
- มี **embed meta tags** (`fc:miniapp` และ `fc:frame`) ตามเอกสาร Farcaster
- เมื่อแชร์ URL นี้ใน Farcaster cast จะแสดงเป็น rich embed พร้อมปุ่ม "View NFT"

### 3. Dynamic OG Image (`/api/og`)

- สร้าง dynamic image สำหรับ NFT
- รองรับ aspect ratio 3:2 ตามที่ Farcaster กำหนด
- มี cache headers (`max-age=300`) เพื่อประสิทธิภาพ

## Embed Meta Tags

ตามเอกสาร Farcaster หน้า NFT จะมี meta tags ดังนี้:

```html
<meta name="fc:miniapp" content='{"version":"1","imageUrl":"...","button":{"title":"🎨 View NFT","action":{"type":"launch_miniapp","url":"...","name":"Blad Gamet",...}}}' />
<meta name="fc:frame" content='...' />
```

## Smart Contract Integration

สัญญาที่ใช้: `0xe81B2748149d089eBdaE6Fee36230D98BA00FF49` (Base Mainnet)

Function: `mintForFid(address to, uint256 fid)`

## การใช้งาน

### 1. Mint NFT

1. ไปที่ `/mint`
2. เชื่อมต่อ wallet
3. ใส่ Farcaster FID
4. กด "Mint NFT"
5. รอ transaction confirm

### 2. แชร์ NFT

1. หลังจาก mint สำเร็จ คลิก "View your NFT"
2. หรือไปที่ `/mint/[tokenId]` โดยตรง
3. Copy URL และแชร์ใน Farcaster cast
4. URL จะแสดงเป็น rich embed พร้อมปุ่ม "View NFT"

## ข้อกำหนดจาก Farcaster

### Image Requirements
- **Format**: PNG, JPG, GIF, WebP (แนะนำ PNG)
- **Aspect Ratio**: 3:2
- **Minimum**: 600x400px
- **Maximum**: 3000x2000px
- **File Size**: < 10MB
- **URL Length**: ≤ 1024 characters

### Cache Headers
- ใช้ `Cache-Control: public, immutable, no-transform, max-age=300` สำหรับ dynamic images
- ตั้ง `max-age` ที่เหมาะสมเพื่อให้ภาพ fresh แต่ยัง cache ได้

## Environment Variables

```env
NEXT_PUBLIC_ROOT_URL=http://localhost:3000  # หรือ production URL
```

## การทดสอบ

### Local Development

1. ใช้ `cloudflared` หรือ `ngrok` เพื่อ expose localhost:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```

2. เปิด tunnel URL ใน browser ก่อน (security measure)

3. ใช้ tunnel URL ใน Warpcast Mini App Embed Tool เพื่อทดสอบ

### Production

- ตรวจสอบว่า domain ตรงกับ manifest domain
- ตรวจสอบว่า OG images โหลดได้
- ทดสอบการแชร์ใน Farcaster cast

## เอกสารอ้างอิง

- [Farcaster Mini Apps Sharing Guide](https://miniapps.farcaster.xyz/docs/guides/sharing)
- [BaseScan Contract](https://basescan.org/address/0xe81b2748149d089ebdae6fee36230d98ba00ff49#code)

