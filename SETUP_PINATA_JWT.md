# วิธีตั้งค่า PINATA_JWT บน Vercel

## ✅ JWT Token ที่จะใช้

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJmNmI2NWM4Ni05ZWFkLTQyMTYtODc0MC00ODQ5YWQ3NDRkZWYiLCJlbWFpbCI6InJhaWtlbm9uaXNhbkBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiYTk3N2VlYmM5MDMxOWYyOGY0NTAiLCJzY29wZWRLZXlTZWNyZXQiOiI4NTExOTExNjg3ZTE2MzY4Mjg2NTNlYmE3ZTJiMTU2MzA2ZmIwNjljZGE3YWY2MGM2MGYzM2Y3ODMzMDZiZTk0IiwiZXhwIjoxNzk1MTU0OTU5fQ.UGlSUGxNGHz5AEKnhAIdP3RRHrPEQ5dicdYbE4zDtBQ
```

## วิธีที่ 1: ใช้สคริปต์ PowerShell (แนะนำสำหรับ Windows)

1. เปิด PowerShell ในโฟลเดอร์โปรเจกต์
2. รันคำสั่ง:
   ```powershell
   .\add-pinata-env.ps1
   ```
3. สคริปต์จะเพิ่ม `PINATA_JWT` ไปยัง Production, Preview, และ Development environments อัตโนมัติ

## วิธีที่ 2: ผ่าน Vercel Dashboard (ง่ายที่สุด)

1. ไปที่ https://vercel.com/dashboard
2. เลือกโปรเจกต์ **baldgame**
3. ไปที่ **Settings** → **Environment Variables**
4. คลิก **Add New**
5. ใส่ข้อมูล:
   - **Name**: `PINATA_JWT`
   - **Value**: วาง JWT token ด้านบน
   - **Environment**: เลือก Production, Preview, Development (หรือเลือกทั้งหมด)
6. คลิก **Save**
7. **Redeploy**: ไปที่ **Deployments** → เลือก deployment ล่าสุด → คลิก **"..."** → **Redeploy**

## วิธีที่ 3: ใช้ Vercel CLI

```bash
# เพิ่มใน Production
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJmNmI2NWM4Ni05ZWFkLTQyMTYtODc0MC00ODQ5YWQ3NDRkZWYiLCJlbWFpbCI6InJhaWtlbm9uaXNhbkBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiYTk3N2VlYmM5MDMxOWYyOGY0NTAiLCJzY29wZWRLZXlTZWNyZXQiOiI4NTExOTExNjg3ZTE2MzY4Mjg2NTNlYmE3ZTJiMTU2MzA2ZmIwNjljZGE3YWY2MGM2MGYzM2Y3ODMzMDZiZTk0IiwiZXhwIjoxNzk1MTU0OTU5fQ.UGlSUGxNGHz5AEKnhAIdP3RRHrPEQ5dicdYbE4zDtBQ" | vercel env add PINATA_JWT production

# เพิ่มใน Preview
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJmNmI2NWM4Ni05ZWFkLTQyMTYtODc0MC00ODQ5YWQ3NDRkZWYiLCJlbWFpbCI6InJhaWtlbm9uaXNhbkBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiYTk3N2VlYmM5MDMxOWYyOGY0NTAiLCJzY29wZWRLZXlTZWNyZXQiOiI4NTExOTExNjg3ZTE2MzY4Mjg2NTNlYmE3ZTJiMTU2MzA2ZmIwNjljZGE3YWY2MGM2MGYzM2Y3ODMzMDZiZTk0IiwiZXhwIjoxNzk1MTU0OTU5fQ.UGlSUGxNGHz5AEKnhAIdP3RRHrPEQ5dicdYbE4zDtBQ" | vercel env add PINATA_JWT preview

# เพิ่มใน Development
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJmNmI2NWM4Ni05ZWFkLTQyMTYtODc0MC00ODQ5YWQ3NDRkZWYiLCJlbWFpbCI6InJhaWtlbm9uaXNhbkBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiYTk3N2VlYmM5MDMxOWYyOGY0NTAiLCJzY29wZWRLZXlTZWNyZXQiOiI4NTExOTExNjg3ZTE2MzY4Mjg2NTNlYmE3ZTJiMTU2MzA2ZmIwNjljZGE3YWY2MGM2MGYzM2Y3ODMzMDZiZTk0IiwiZXhwIjoxNzk1MTU0OTU5fQ.UGlSUGxNGHz5AEKnhAIdP3RRHrPEQ5dicdYbE4zDtBQ" | vercel env add PINATA_JWT development
```

## ⚠️ สิ่งสำคัญที่ต้องทำหลังจากตั้งค่า

1. **Redeploy Project** (สำคัญมาก!)
   - ไปที่ Vercel Dashboard → Deployments
   - คลิก "..." บน deployment ล่าสุด
   - เลือก **Redeploy**

2. **ตรวจสอบว่าใช้งานได้**
   - ไปที่หน้า mint
   - ลอง mint NFT
   - ตรวจสอบ console log ว่ามี "Image uploaded to IPFS" หรือไม่

## ตรวจสอบว่า Environment Variable ถูกตั้งค่าแล้ว

### ผ่าน Dashboard:
1. ไปที่ **Settings** → **Environment Variables**
2. ตรวจสอบว่ามี `PINATA_JWT` อยู่

### ผ่าน CLI:
```bash
vercel env ls
```

## Troubleshooting

### Environment variable ไม่ทำงาน
- ✅ ตรวจสอบว่าได้ **Redeploy** แล้ว
- ✅ ตรวจสอบว่าเลือก Environment ถูกต้อง (Production/Preview/Development)
- ✅ ตรวจสอบว่า value ถูกต้อง (ไม่มี space หรือ newline)

### ยังเห็น error "Pinata API credentials not configured"
- ✅ ตรวจสอบว่า environment variable ชื่อถูกต้อง: `PINATA_JWT`
- ✅ ตรวจสอบว่าได้ Redeploy แล้ว
- ✅ ตรวจสอบ logs ใน Vercel dashboard

