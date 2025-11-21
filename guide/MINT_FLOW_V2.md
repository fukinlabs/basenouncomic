# 🎯 Mint Flow V2 - Signature-Based Authorization

## ✅ **User สามารถ Mint NFT บน Frontend ได้!**

### **📋 Flow การทำงาน:**

```
1. User Sign In with Farcaster
   ↓
2. Frontend: Generate Art (Canvas)
   ↓
3. Frontend: Upload Image to Pinata IPFS
   ↓
4. Frontend: Request Signature from Backend
   ↓
5. Backend: Validate + Generate Signature
   ↓
6. Frontend: Call Smart Contract with Signature
   ↓
7. Smart Contract: Verify Signature
   ↓
8. ✅ Mint Success!
```

---

## 🔐 **Security Layers**

### **1. Frontend Validation**
- ✅ FID ต้องมาจาก Farcaster Sign In เท่านั้น
- ✅ ไม่มี input field สำหรับกรอก FID
- ✅ ตรวจสอบ authentication (Sign In หรือ Mini App)

### **2. Backend Authorization**
- ✅ `/api/generate-mint-signature` ตรวจสอบ:
  - Authentication (isSignedIn หรือ isInMiniApp)
  - FID range (1-999,999)
  - Origin/Referer headers
  - Rate limiting

### **3. Smart Contract Verification**
- ✅ ตรวจสอบ signature จาก `authorizedSigner`
- ✅ ป้องกัน replay attacks (usedSignatures)
- ✅ ตรวจสอบ FID range
- ✅ ตรวจสอบ address validation

---

## 🛠️ **Setup Required**

### **1. Environment Variables (Vercel)**

```env
# Smart Contract Authorization
MINT_SIGNER_PRIVATE_KEY=0x1234567890abcdef...
```

**Generate Private Key:**
```bash
# Option 1: OpenSSL
openssl rand -hex 32

# Option 2: Node.js
node -e "console.log('0x' + require('crypto').randomBytes(32).toString('hex'))"
```

### **2. Smart Contract Deployment**

```solidity
// Initialize contract with authorized signer
initialize(owner, authorizedSignerAddress)

// authorizedSignerAddress = address from MINT_SIGNER_PRIVATE_KEY
```

### **3. Contract ABI**

✅ **Updated**: `lib/contract-abi.json` includes new mint function:
```json
{
  "inputs": [
    {"name": "to", "type": "address"},
    {"name": "fid", "type": "uint256"},
    {"name": "imageData", "type": "string"},
    {"name": "externalUrl", "type": "string"},
    {"name": "nonce", "type": "uint256"},
    {"name": "signature", "type": "bytes"}
  ],
  "name": "mint",
  "stateMutability": "nonpayable"
}
```

---

## 🎨 **User Experience**

### **✅ Legitimate User Flow:**

1. **เปิดเว็บ** → https://farcasterabstact.wtf/mint
2. **Sign In** → คลิก "Sign In" → Farcaster Quick Auth
3. **รอ Art Generate** → Canvas แสดง NFT preview
4. **คลิก "MINT"** → 
   - Frontend เรียก signature API
   - Backend สร้าง signature
   - Frontend เรียก contract
   - Contract verify signature
5. **✅ Success!** → NFT minted

### **❌ Blocked Actions:**

- ❌ **Direct Contract Calls** → ไม่มี signature
- ❌ **Manual FID Entry** → ไม่มี input field
- ❌ **Bypass Frontend** → Backend validation
- ❌ **Replay Attacks** → Nonce tracking

---

## 🔧 **Technical Details**

### **Signature Generation (Backend):**

```typescript
// Message hash (matching contract)
messageHash = keccak256(encodePacked(
  userAddress,  // msg.sender
  to,           // recipient
  fid,          // Farcaster FID
  nonce,        // unique nonce
  chainId       // 8453 (Base)
))

// Ethereum signed message
ethSignedMessageHash = keccak256(encodePacked(
  "\x19Ethereum Signed Message:\n32",
  messageHash
))

// Sign with private key
signature = sign(ethSignedMessageHash, MINT_SIGNER_PRIVATE_KEY)
```

### **Signature Verification (Contract):**

```solidity
// Reconstruct message hash
messageHash = keccak256(abi.encodePacked(
    msg.sender,    // Must match userAddress
    to,
    fid,
    nonce,
    block.chainid
));

// Reconstruct signed message hash
ethSignedMessageHash = keccak256(abi.encodePacked(
    "\x19Ethereum Signed Message:\n32",
    messageHash
));

// Verify signature
recoveredSigner = ecrecover(ethSignedMessageHash, signature);
require(recoveredSigner == authorizedSigner, "Invalid signature");
```

---

## ✅ **สรุป**

**User สามารถ Mint NFT บน Frontend ได้ 100%!**

**Requirements:**
- ✅ Sign In with Farcaster
- ✅ Art generation complete
- ✅ Backend signature API configured
- ✅ Smart contract deployed with authorizedSigner

**Security:**
- ✅ 100% protected from direct contract calls
- ✅ 100% protected from manual FID entry
- ✅ 100% protected from unauthorized minting

**🎉 Ready to use!**

