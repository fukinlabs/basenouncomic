# วิธีเพิ่ม Environment Variables ใน Vercel

## วิธีที่ 1: ผ่าน Vercel Dashboard (แนะนำ)

1. ไปที่ https://vercel.com/dashboard
2. เลือกโปรเจกต์ของคุณ (baldgame)
3. ไปที่ **Settings** → **Environment Variables**
4. เพิ่มตัวแปร:
   - **Name**: `PINATA_JWT`
   - **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI4NWYxYjQxZC1mNjNiLTQ2NzAtOTkwNi00MTI5YTEzY2UxODMiLCJlbWFpbCI6ImZ1a2lubGFic0BnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiMzJiZjIxYzk4ZDY5YjMzN2YwMzEiLCJzY29wZWRLZXlTZWNyZXQiOiIzNGYwMTk5NTQxMDQwOGEzNzc5NTJlMjdhZjYyOTIzYzQ1MmVlZTI4NjYzNGVmN2IwMWFmYmFiYTQzM2U4OTY3IiwiZXhwIjoxNzk0MTI5MTM2fQ.NEmeTYEsGp3PMywEyCc_SWIHmGTgYJH62tPJOYunp8k`
   - **Environment**: เลือก Production, Preview, Development (หรือเลือกทั้งหมด)
   - คลิก **Save**
5. **Redeploy**: ไปที่ **Deployments** → เลือก deployment ล่าสุด → คลิก **"..."** → **Redeploy**

## วิธีที่ 2: ใช้ Vercel CLI

```bash
# เพิ่ม environment variable
vercel env add PINATA_JWT production

# หรือเพิ่มหลาย environment พร้อมกัน
vercel env add PINATA_JWT production preview development
```

เมื่อรันคำสั่ง Vercel จะถามให้ใส่ value:
- วาง JWT token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- กด Enter

## วิธีที่ 3: ใช้ไฟล์ .env (สำหรับ Local Development เท่านั้น)

สร้างไฟล์ `.env.local` ในโปรเจกต์:

```bash
PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI4NWYxYjQxZC1mNjNiLTQ2NzAtOTkwNi00MTI5YTEzY2UxODMiLCJlbWFpbCI6ImZ1a2lubGFic0BnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiMzJiZjIxYzk4ZDY5YjMzN2YwMzEiLCJzY29wZWRLZXlTZWNyZXQiOiIzNGYwMTk5NTQxMDQwOGEzNzc5NTJlMjdhZjYyOTIzYzQ1MmVlZTI4NjYzNGVmN2IwMWFmYmFiYTQzM2U4OTY3IiwiZXhwIjoxNzk0MTI5MTM2fQ.NEmeTYEsGp3PMywEyCc_SWIHmGTgYJH62tPJOYunp8k
```

**⚠️ หมายเหตุ:** ไฟล์ `.env.local` ใช้สำหรับ local development เท่านั้น และจะไม่ถูก commit ไปที่ GitHub (ควรอยู่ใน `.gitignore`)

## ตรวจสอบว่า Environment Variables ถูกตั้งค่าแล้ว

### ผ่าน Dashboard:
1. ไปที่ **Settings** → **Environment Variables**
2. ตรวจสอบว่ามี `PINATA_JWT` อยู่

### ผ่าน CLI:
```bash
vercel env ls
```

## หลังจากตั้งค่าแล้ว

1. **Redeploy** project (สำคัญมาก!)
   - ไปที่ **Deployments** → คลิก **"..."** → **Redeploy**
   - หรือ push code ใหม่ขึ้น GitHub (Vercel จะ deploy อัตโนมัติ)

2. **ทดสอบ**:
   - ไปที่หน้า mint
   - ลอง mint NFT
   - ตรวจสอบ console log ว่ามี "Image uploaded to IPFS" หรือไม่

## Troubleshooting

### Environment variable ไม่ทำงาน
- ✅ ตรวจสอบว่าได้ **Redeploy** แล้ว
- ✅ ตรวจสอบว่าเลือก Environment ถูกต้อง (Production/Preview/Development)
- ✅ ตรวจสอบว่า value ถูกต้อง (ไม่มี space หรือ newline)

### ยังเห็น error "Pinata API credentials not configured"
- ✅ ตรวจสอบว่า environment variable ชื่อถูกต้อง: `PINATA_JWT`
- ✅ ตรวจสอบว่าได้ Redeploy แล้ว
- ✅ ตรวจสอบ logs ใน Vercel dashboard

