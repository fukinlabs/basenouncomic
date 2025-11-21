# Environment Variables Setup

## Required Environment Variables

### 1. Next.js Configuration
```env
NEXT_PUBLIC_ROOT_URL=https://farcasterabstact.wtf
```

### 2. Pinata IPFS
```env
PINATA_JWT=your_pinata_jwt_token_here
PINATA_API_KEY=your_pinata_api_key_here
PINATA_SECRET_API_KEY=your_pinata_secret_key_here
```

### 3. Smart Contract Authorization (NEW - Required for signature-based minting)
```env
# Generate a new private key for signing
# Command: openssl rand -hex 32
MINT_SIGNER_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# The corresponding address (will be set as authorizedSigner in contract)
MINT_SIGNER_ADDRESS=0x742d35cc6C6C4e79b6E7a99D0D5C4D2Ed0b7c34F
```

### 4. Base Network
```env
BASE_RPC_URL=https://mainnet.base.org
```

## How to Generate MINT_SIGNER_PRIVATE_KEY

### Option 1: Using OpenSSL
```bash
openssl rand -hex 32
```

### Option 2: Using Node.js
```javascript
const crypto = require('crypto');
console.log('0x' + crypto.randomBytes(32).toString('hex'));
```

### Option 3: Using ethers.js
```javascript
const { ethers } = require('ethers');
const wallet = ethers.Wallet.createRandom();
console.log('Private Key:', wallet.privateKey);
console.log('Address:', wallet.address);
```

## Security Notes

1. **NEVER commit private keys to git**
2. **Use different private keys for different environments**
3. **Store private keys securely in Vercel environment variables**
4. **The MINT_SIGNER_ADDRESS must be set as authorizedSigner in the smart contract**

## Vercel Setup

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add all the required variables above
3. Make sure to set them for Production, Preview, and Development environments
4. Redeploy after adding new environment variables
