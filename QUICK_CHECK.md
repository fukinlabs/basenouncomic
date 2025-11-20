# วิธีตรวจสอบ Pinata Status อย่างรวดเร็ว

## ✅ วิธีที่เร็วที่สุด: ตรวจสอบ Vercel Dashboard

1. ไปที่: https://vercel.com/dashboard
2. เลือกโปรเจกต์ **baldgame**
3. ไปที่ **Settings** → **Environment Variables**
4. ดูว่ามี `PINATA_JWT` อยู่หรือไม่

## 🔍 วิธีทดสอบ: ลอง Mint NFT

1. ไปที่: https://farcasterabstact.wtf/mint
2. Sign In ด้วย Farcaster
3. Generate Art
4. เปิด Browser Console (กด F12)
5. คลิก Mint NFT
6. ดู Console Log:
   - ✅ **ถ้าเห็น**: `"Image uploaded to IPFS: https://gateway.pinata.cloud/ipfs/..."`
     → **Pinata ทำงานแล้ว! ✅**
   - ❌ **ถ้าเห็น**: `"Pinata not configured, using base64 directly"`
     → **Pinata ยังไม่ซิงค์ ❌**

## 📝 สรุป

**ถ้ายังไม่ซิงค์:**
1. ตั้งค่า `PINATA_JWT` ใน Vercel Dashboard
2. Redeploy project
3. ทดสอบอีกครั้ง

**JWT Token ที่จะใช้:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJmNmI2NWM4Ni05ZWFkLTQyMTYtODc0MC00ODQ5YWQ3NDRkZWYiLCJlbWFpbCI6InJhaWtlbm9uaXNhbkBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiYTk3N2VlYmM5MDMxOWYyOGY0NTAiLCJzY29wZWRLZXlTZWNyZXQiOiI4NTExOTExNjg3ZTE2MzY4Mjg2NTNlYmE3ZTJiMTU2MzA2ZmIwNjljZGE3YWY2MGM2MGYzM2Y3ODMzMDZiZTk0IiwiZXhwIjoxNzk1MTU0OTU5fQ.UGlSUGxNGHz5AEKnhAIdP3RRHrPEQ5dicdYbE4zDtBQ
```

