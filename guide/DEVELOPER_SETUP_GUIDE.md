# 🛠️ Developer Setup Guide - MINT_SIGNER_PRIVATE_KEY

## 📋 ขั้นตอนสำหรับ Developer

### **Step 1: Generate Private Key**

#### Option 1: ใช้ Node.js (แนะนำ)
```bash
node -e "console.log('0x' + require('crypto').randomBytes(32).toString('hex'))"
```

**Output:**
```
0xef8993aefc23c713c5046995fe15d801dd206a68b050bbcb5b042cfbaf5e176f
```

#### Option 2: ใช้ OpenSSL (ถ้ามี)
```bash
openssl rand -hex 32
```

**Output:**
```
ef8993aefc23c713c5046995fe15d801dd206a68b050bbcb5b042cfbaf5e176f
# เพิ่ม 0x นำหน้า: 0xef8993aefc23c713c5046995fe15d801dd206a68b050bbcb5b042cfbaf5e176f
```

---

### **Step 2: Get Address จาก Private Key**

สร้างไฟล์ `get-address.js`:
```javascript
const { privateKeyToAccount } = require('viem/accounts');

const privateKey = '0xef8993aefc23c713c5046995fe15d801dd206a68b050bbcb5b042cfbaf5e176f';
const account = privateKeyToAccount(privateKey);

console.log('Private Key:', privateKey);
console.log('Address:', account.address);
```

รันคำสั่ง:
```bash
node get-address.js
```

**Output:**
```
Private Key: 0xef8993aefc23c713c5046995fe15d801dd206a68b050bbcb5b042cfbaf5e176f
Address: 0x742d35Cc6C6C4e79b6E7a99D0D5C4D2Ed0b7c34F
```

**หรือใช้คำสั่งเดียว:**
```bash
node -e "const { privateKeyToAccount } = require('viem/accounts'); const account = privateKeyToAccount('0xef8993aefc23c713c5046995fe15d801dd206a68b050bbcb5b042cfbaf5e176f'); console.log('Address:', account.address);"
```

---

### **Step 3: ตั้งค่าใน Vercel**

1. **ไปที่ Vercel Dashboard**
   - https://vercel.com/dashboard
   - เลือก Project ของคุณ

2. **ไปที่ Settings → Environment Variables**
   - คลิก "Add New"
   - กรอกข้อมูล:
     - **Key:** `MINT_SIGNER_PRIVATE_KEY`
     - **Value:** `0xef8993aefc23c713c5046995fe15d801dd206a68b050bbcb5b042cfbaf5e176f` (ใช้ private key ที่ generate)
     - **Environment:** เลือกทั้งหมด (Production, Preview, Development)

3. **Save และ Redeploy**
   - คลิก "Save"
   - ไปที่ Deployments → คลิก "Redeploy" เพื่อให้ environment variable มีผล

---

### **Step 4: Initialize Smart Contract**

เมื่อ deploy contract ใหม่ ต้อง initialize ด้วย `authorizedSigner` address:

```solidity
// ใน deployment script หรือ Remix/Hardhat
contract.initialize(
    owner,                    // Your owner address
    authorizedSignerAddress   // Address จาก Step 2
);
```

**ตัวอย่าง:**
```javascript
// Hardhat deployment script
const { ethers } = require("hardhat");

async function main() {
  const FarcasterAbstract = await ethers.getContractFactory("FarcasterAbstract");
  const contract = await FarcasterAbstract.deploy();
  
  await contract.deployed();
  
  const owner = "0x..."; // Your owner address
  const authorizedSigner = "0x742d35Cc6C6C4e79b6E7a99D0D5C4D2Ed0b7c34F"; // From Step 2
  
  await contract.initialize(owner, authorizedSigner);
  
  console.log("Contract deployed to:", contract.address);
  console.log("Authorized signer set to:", authorizedSigner);
}
```

---

## ✅ Checklist

- [ ] Generate Private Key (Step 1)
- [ ] Get Address จาก Private Key (Step 2)
- [ ] ตั้งค่า `MINT_SIGNER_PRIVATE_KEY` ใน Vercel (Step 3)
- [ ] Initialize Contract ด้วย `authorizedSigner` address (Step 4)
- [ ] Redeploy Vercel เพื่อให้ environment variable มีผล
- [ ] Test minting เพื่อยืนยันว่าทำงานได้

---

## 🔍 ตรวจสอบการตั้งค่า

### ตรวจสอบ Vercel Environment Variable
1. ไปที่ Vercel Dashboard → Project → Settings → Environment Variables
2. ตรวจสอบว่า `MINT_SIGNER_PRIVATE_KEY` ถูกตั้งค่าแล้ว
3. ตรวจสอบว่าเลือก Environment ทั้งหมด (Production, Preview, Development)

### ตรวจสอบ Contract
```javascript
// ตรวจสอบ authorizedSigner ใน contract
const authorizedSigner = await contract.authorizedSigner();
console.log("Authorized Signer:", authorizedSigner);
// ต้องตรงกับ address จาก Step 2
```

### Test API Endpoint
```bash
curl -X POST https://farcasterabstact.wtf/api/generate-mint-signature \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0x...",
    "to": "0x...",
    "fid": "12345",
    "isSignedIn": true,
    "isInMiniApp": false
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "signature": "0x...",
  "nonce": 1234567890,
  "signer": "0x742d35Cc6C6C4e79b6E7a99D0D5C4D2Ed0b7c34F"
}
```

---

## ⚠️ Security Notes

1. **NEVER commit private key to git**
   - ตรวจสอบว่า `.env` และไฟล์ที่มี private key อยู่ใน `.gitignore`

2. **Use different keys for different environments**
   - Production: ใช้ key หนึ่ง
   - Preview/Development: ใช้ key อื่น (ถ้าต้องการ)

3. **Store securely**
   - เก็บ private key ใน Vercel Environment Variables เท่านั้น
   - อย่าเก็บใน code หรือ config files

4. **Backup**
   - เก็บ private key ไว้ในที่ปลอดภัย (password manager)
   - ถ้าเสีย private key → ต้อง generate ใหม่และ update contract

---

## 🆘 Troubleshooting

### Error: "MINT_SIGNER_PRIVATE_KEY not configured"
- **Solution:** ตรวจสอบว่าได้ตั้งค่า environment variable ใน Vercel แล้ว
- **Solution:** Redeploy project หลังจากตั้งค่า environment variable

### Error: "Invalid signature - only authorized mints allowed"
- **Solution:** ตรวจสอบว่า contract ถูก initialize ด้วย `authorizedSigner` address ที่ถูกต้อง
- **Solution:** ตรวจสอบว่า address จาก private key ตรงกับ `authorizedSigner` ใน contract

### Error: "Signature already used"
- **Solution:** ใช้ nonce ใหม่ (API จะ generate nonce อัตโนมัติ)
- **Solution:** ตรวจสอบว่าไม่ได้ใช้ signature เดิมซ้ำ

---

## 📚 References

- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [viem Documentation](https://viem.sh/)
- [Ethereum Signing](https://ethereum.org/en/developers/docs/transactions/)

