# 🔍 สาเหตุที่ Mint ไม่ได้ - วิธีแก้ไข

## 📋 สาเหตุหลักที่ Mint ไม่ได้

### 1. ❌ **Signature Verification Failed** (สาเหตุที่พบบ่อยที่สุด)
**Error Message:** `"Invalid signature - only authorized mints allowed"`

**สาเหตุ:**
- Signature ไม่ตรงกับ `authorizedSigner` ใน contract
- Backend ไม่ได้ตั้งค่า `MINT_SIGNER_PRIVATE_KEY` ถูกต้อง
- Signature ถูกสร้างด้วย private key ที่ไม่ตรงกับ `authorizedSigner`
- Message hash ที่สร้างไม่ตรงกับ contract (chainId, nonce, address ไม่ตรง)

**วิธีแก้ไข:**
```bash
# ตรวจสอบ authorizedSigner ใน contract
# ตรวจสอบว่า MINT_SIGNER_PRIVATE_KEY ใน backend ตรงกับ authorizedSigner หรือไม่
```

**ตรวจสอบ:**
- เรียก `authorizedSigner()` ใน contract
- ตรวจสอบว่า address ที่ได้จาก `MINT_SIGNER_PRIVATE_KEY` ตรงกันหรือไม่

---

### 2. ❌ **Already Minted**
**Error Message:** `"Already minted"`

**สาเหตุ:**
- Address นี้ mint ไปแล้ว (1 address = 1 NFT เท่านั้น)
- `hasMinted[msg.sender] = true`

**วิธีแก้ไข:**
- ใช้ address อื่นในการ mint
- หรือให้ owner เรียก `resetMintStatus(address)` (กรณี emergency)

**ตรวจสอบ:**
```solidity
hasAddressMinted(address) // เรียกดูว่า address นี้ mint แล้วหรือยัง
```

---

### 3. ❌ **FID Already Used**
**Error Message:** `"FID used"`

**สาเหตุ:**
- FID นี้ถูกใช้ mint ไปแล้ว (1 FID = 1 NFT เท่านั้น)
- `mintedFid[fid] = true`

**วิธีแก้ไข:**
- ใช้ FID อื่นที่ยังไม่เคย mint

**ตรวจสอบ:**
```solidity
isFidUsed(uint256 fid) // เรียกดูว่า FID นี้ใช้แล้วหรือยัง
```

---

### 4. ❌ **Max Supply Reached**
**Error Message:** `"Mint! Out Thank"`

**สาเหตุ:**
- Mint ครบ 12,345 NFT แล้ว
- `nextId >= MAX_SUPPLY`

**วิธีแก้ไข:**
- ไม่สามารถ mint ได้อีก (collection เต็มแล้ว)

**ตรวจสอบ:**
```solidity
totalSupply() // ดูจำนวน NFT ที่ mint แล้ว
nextId()      // ดู nextId ปัจจุบัน
MAX_SUPPLY    // 12,345
```

---

### 5. ❌ **Invalid FID Range**
**Error Message:** `"Invalid FID range"`

**สาเหตุ:**
- FID <= 0 หรือ FID >= 1,000,000
- Contract จำกัด FID ไว้ที่ 0 < FID < 1,000,000

**วิธีแก้ไข:**
- ใช้ FID ที่อยู่ในช่วง 1 ถึง 999,999

---

### 6. ❌ **Signature Already Used (Replay Attack)**
**Error Message:** `"Signature already used"`

**สาเหตุ:**
- Signature นี้ถูกใช้ไปแล้ว
- Contract ป้องกัน replay attack โดยเก็บ signature hash ไว้

**วิธีแก้ไข:**
- Request signature ใหม่จาก backend (nonce จะเปลี่ยน)

---

### 7. ❌ **Invalid Recipient Address**
**Error Message:** `"Invalid recipient address"`

**สาเหตุ:**
- `to` parameter เป็น `address(0)`

**วิธีแก้ไข:**
- ตรวจสอบว่า `to` parameter ไม่เป็น address(0)

---

### 8. ❌ **Empty Image Data**
**Error Message:** `"Image data required"`

**สาเหตุ:**
- `imageData` เป็น empty string

**วิธีแก้ไข:**
- ตรวจสอบว่า imageData มีค่าถูกส่งไป

---

### 9. ❌ **Invalid Signature Length**
**Error Message:** `"Invalid signature length"`

**สาเหตุ:**
- Signature ไม่ใช่ 65 bytes (standard ECDSA signature)

**วิธีแก้ไข:**
- ตรวจสอบว่า signature format ถูกต้อง

---

## 🔧 วิธีตรวจสอบปัญหา

### Step 1: ตรวจสอบ Contract State
```javascript
// ตรวจสอบ authorizedSigner
const authorizedSigner = await contract.authorizedSigner();

// ตรวจสอบว่า address mint แล้วหรือยัง
const hasMinted = await contract.hasAddressMinted(userAddress);

// ตรวจสอบว่า FID ใช้แล้วหรือยัง
const isFidUsed = await contract.isFidUsed(fid);

// ตรวจสอบ total supply
const totalSupply = await contract.totalSupply();
const maxSupply = await contract.MAX_SUPPLY();
const nextId = await contract.nextId();
```

### Step 2: ตรวจสอบ Backend Configuration
```bash
# ตรวจสอบ environment variable
echo $MINT_SIGNER_PRIVATE_KEY

# ตรวจสอบว่า private key ตรงกับ authorizedSigner หรือไม่
# ใช้ viem หรือ ethers เพื่อ derive address จาก private key
```

### Step 3: ตรวจสอบ Signature Generation
```typescript
// ตรวจสอบว่า message hash ที่สร้างตรงกับ contract หรือไม่
const messageHash = keccak256(
  encodePacked(
    ["address", "address", "uint256", "uint256", "uint256"],
    [userAddress, to, BigInt(fid), BigInt(nonce), BigInt(chainId)] // chainId = 8453 (Base)
  )
);

// ตรวจสอบว่า chainId ถูกต้อง (Base = 8453)
```

### Step 4: ตรวจสอบ Frontend
- ตรวจสอบว่า `msg.sender` (wallet address) ตรงกับ `userAddress` ที่ส่งไปให้ backend หรือไม่
- ตรวจสอบว่า `to` parameter ไม่เป็น address(0)
- ตรวจสอบว่า `fid` อยู่ในช่วง 1-999,999
- ตรวจสอบว่า `imageData` ไม่เป็น empty

---

## 🎯 Checklist ก่อน Mint

- [ ] ✅ Sign in ด้วย Farcaster แล้ว
- [ ] ✅ Wallet connected (Base network)
- [ ] ✅ FID ถูกต้องและยังไม่เคยใช้
- [ ] ✅ Address นี้ยังไม่เคย mint
- [ ] ✅ Total supply ยังไม่เต็ม (nextId < 12,345)
- [ ] ✅ Backend มี `MINT_SIGNER_PRIVATE_KEY` ตั้งค่าไว้
- [ ] ✅ `authorizedSigner` ใน contract ตรงกับ address จาก private key
- [ ] ✅ Image data ไม่เป็น empty
- [ ] ✅ Chain ID ถูกต้อง (Base = 8453)

---

## 🚨 กรณี Emergency (Owner Only)

### Reset Mint Status
```solidity
// ให้ address mint ใหม่ได้ (กรณีจำเป็น)
resetMintStatus(address)
```

### Update Authorized Signer
```solidity
// เปลี่ยน authorized signer (กรณี private key หลุด)
setAuthorizedSigner(address newSigner)
```

---

## 📞 Debug Tips

1. **ดู Transaction Error:**
   - เปิด Basescan → Transaction → ดู error message
   - หรือดู console log ใน browser

2. **ตรวจสอบ Contract:**
   - เรียก read functions เพื่อดู state
   - ตรวจสอบว่า parameters ถูกต้อง

3. **ตรวจสอบ Backend:**
   - ดู logs ใน `/api/generate-mint-signature`
   - ตรวจสอบว่า signature ถูกสร้างถูกต้อง

4. **ตรวจสอบ Frontend:**
   - เปิด browser console
   - ดู error messages และ logs

---

## 🔗 Links ที่เกี่ยวข้อง

- Contract: https://basescan.org/address/0x2a989a23bb7cf751d1143fb867a1567a68e5fa59#code
- Base Network: https://base.org
- Basescan: https://basescan.org

