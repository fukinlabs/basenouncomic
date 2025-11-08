# คู่มือการตั้งค่า Pinata IPFS

## ภาพรวม

ระบบนี้ใช้ **Pinata** เพื่ออัปโหลดภาพ NFT ไปยัง IPFS แทนการเก็บ base64 string ใน smart contract ซึ่งจะช่วย:
- ลด gas cost (ไม่ต้องเก็บข้อมูลขนาดใหญ่ใน contract)
- เก็บภาพแบบ decentralized บน IPFS
- รองรับ metadata JSON สำหรับ NFT

## ขั้นตอนการตั้งค่า

### 1. สร้างบัญชี Pinata

1. ไปที่ [Pinata.cloud](https://pinata.cloud)
2. สร้างบัญชีใหม่ (ฟรี)
3. ไปที่ **API Keys** ใน dashboard

### 2. สร้าง API Key

1. คลิก **"New Key"**
2. ตั้งชื่อ key (เช่น "NFT Mint App")
3. เลือก permissions:
   - ✅ **pinFileToIPFS** (จำเป็น)
   - ✅ **pinJSONToIPFS** (แนะนำ)
4. คลิก **"Create Key"**
5. **บันทึก API Key และ Secret Key** (จะแสดงแค่ครั้งเดียว!)

### 3. ตั้งค่า Environment Variables

**วิธีที่ 1: ใช้ JWT Token (แนะนำ)**

เพิ่ม environment variable ใน Vercel หรือ `.env.local`:

```bash
PINATA_JWT=your_jwt_token_here
```

**วิธีที่ 2: ใช้ API Key + Secret**

```bash
PINATA_API_KEY=your_pinata_api_key_here
PINATA_SECRET_API_KEY=your_pinata_secret_key_here
```

**หมายเหตุ:** ระบบจะใช้ JWT token ก่อน หากไม่มีจะใช้ API Key + Secret

**สำหรับ Vercel:**
1. ไปที่ Project Settings → Environment Variables
2. เพิ่ม `PINATA_API_KEY` และ `PINATA_SECRET_API_KEY`
3. Deploy ใหม่

**สำหรับ Local Development:**
สร้างไฟล์ `.env.local`:
```bash
PINATA_API_KEY=your_pinata_api_key_here
PINATA_SECRET_API_KEY=your_pinata_secret_key_here
```

## การทำงาน

### Flow การ Mint NFT:

1. **Generate Art** → สร้างภาพจาก P5.js บน Canvas
2. **Convert to Base64** → แปลง Canvas เป็น base64 string
3. **Upload to Pinata** → อัปโหลดไปยัง IPFS
4. **Get IPFS Hash** → ได้ IPFS hash (เช่น `QmXxxx...`)
5. **Mint NFT** → ส่ง IPFS hash ไปที่ smart contract

### API Endpoint

**POST `/api/upload-pinata`**

Request:
```json
{
  "imageBase64": "data:image/png;base64,iVBORw0KG...",
  "tokenId": "123",
  "fid": "290654"
}
```

Response:
```json
{
  "success": true,
  "image": {
    "ipfsHash": "QmXxxx...",
    "ipfsUrl": "https://gateway.pinata.cloud/ipfs/QmXxxx..."
  },
  "metadata": {
    "ipfsHash": "QmYyyy...",
    "ipfsUrl": "https://gateway.pinata.cloud/ipfs/QmYyyy..."
  }
}
```

## Fallback Mode

หากไม่ได้ตั้งค่า Pinata credentials:
- ระบบจะใช้ base64 string โดยตรง (ไม่แนะนำสำหรับ production)
- จะแสดง warning ใน console
- ยังสามารถ mint ได้ แต่ gas cost จะสูงมาก

## ข้อควรระวัง

1. **API Keys ต้องเก็บเป็นความลับ** - อย่า commit ลง GitHub
2. **Pinata Free Tier** - มี limit 1GB storage และ 1000 requests/วัน
3. **IPFS Gateway** - ใช้ Pinata gateway (`gateway.pinata.cloud`) หรือ public gateway (`ipfs.io`)
4. **Contract Update** - อาจต้องอัปเดต contract ให้รับ IPFS hash แทน base64

## ทางเลือกอื่น

หากไม่ต้องการใช้ Pinata สามารถใช้:
- **NFT.Storage** (ฟรี, จาก Protocol Labs)
- **Web3.Storage** (ฟรี, จาก Protocol Labs)
- **Arweave** (permanent storage)
- **Self-hosted IPFS node**

## Troubleshooting

### Error: "Pinata API credentials not configured"
→ ตรวจสอบว่าได้ตั้งค่า environment variables แล้ว

### Error: "Failed to upload to Pinata"
→ ตรวจสอบ API keys ว่าถูกต้อง และมี quota เหลือ

### Image ไม่แสดง
→ ตรวจสอบ IPFS hash ว่าถูกต้อง และ gateway ทำงาน

