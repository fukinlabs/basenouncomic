# Smart Contract Migration Guide

## การเปลี่ยนแปลงจาก Base64 เป็น IPFS Hash

### Contract เดิม (ใช้ Base64)

```solidity
function mintForFid(address to, uint256 fid, string memory imageBase64) external {
    // สร้าง JSON metadata ที่มี image เป็น base64
    string memory json = string(
        abi.encodePacked(
            '{"name":"BaseP5 #', _uint2str(fid),
            '", "description":"p5.js generated NFT bound to Farcaster FID ', _uint2str(fid),
            '","attributes":[{"trait_type":"FID","value":"', _uint2str(fid), '"}],',
            '"image":"data:image/png;base64,', imageBase64, '"}'
        )
    );
    string memory tokenUri = string(
        abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json)))
    );
    // ...
}
```

**ปัญหาของ Contract เดิม:**
- ❌ ใช้ gas สูง (ต้องสร้าง JSON และ encode base64 ใน contract)
- ❌ ไม่ยืดหยุ่น (metadata ถูก hardcode ใน contract)
- ❌ Base64 image ทำให้ tokenURI ยาวมาก
- ❌ ไม่รองรับการเปลี่ยนแปลง metadata ในอนาคต

### Contract ใหม่ (ใช้ IPFS Hash)

```solidity
function mintForFid(
    address to, 
    uint256 fid, 
    string memory metadataIpfsHash  // เปลี่ยนจาก imageBase64
) external {
    require(!mintedFid[fid], "This FID already minted");
    require(to != address(0), "Invalid address");
    
    mintedFid[fid] = true;
    uint256 tokenId = nextId++;

    // ใช้ IPFS hash โดยตรงเป็น tokenURI
    string memory tokenUri = metadataIpfsHash;
    
    // ถ้า frontend ส่งมาแค่ hash (ไม่มี "ipfs://" prefix) ให้เพิ่ม prefix
    if (!_startsWith(metadataIpfsHash, "ipfs://") && !_startsWith(metadataIpfsHash, "data:")) {
        tokenUri = string(abi.encodePacked("ipfs://", metadataIpfsHash));
    }

    _safeMint(to, tokenId);
    _setTokenURI(tokenId, tokenUri);

    emit MintForFID(to, tokenId, fid);
}
```

**ข้อดีของ Contract ใหม่:**
- ✅ ประหยัด gas (ไม่ต้องสร้าง JSON ใน contract)
- ✅ ยืดหยุ่น (metadata ถูกจัดการโดย backend API)
- ✅ TokenURI สั้น (แค่ IPFS hash)
- ✅ รองรับการเปลี่ยนแปลง metadata ในอนาคต

## Frontend Code (ไม่ต้องเปลี่ยน)

Frontend ส่ง IPFS hash ไปยัง contract แล้ว:

```typescript
// app/mint/page.tsx (บรรทัด 428-430)
const imageData = metadataIpfsHash 
  ? `ipfs://${metadataIpfsHash}` 
  : (ipfsHash ? `ipfs://${ipfsHash}` : imageBase64);

writeContract({
  address: NFT_CONTRACT_ADDRESS,
  abi: contractABI,
  functionName: "mintForFid",
  args: [address, BigInt(fid), imageData],  // ส่ง "ipfs://QmHash..."
});
```

## Metadata JSON (บน IPFS)

Backend API สร้าง metadata JSON และ upload ไปยัง Pinata:

```json
{
  "name": "BaseP5 #123",
  "description": "p5.js generated NFT bound to Farcaster FID 123",
  "image": "https://your-domain.com/api/nft-image/123",
  "external_url": "https://your-domain.com/mint/123",
  "attributes": [
    { "trait_type": "FID", "value": "123" },
    { "trait_type": "Token ID", "value": "123" }
  ]
}
```

**หมายเหตุ:** `image` field ใช้ canvas art endpoint (`/api/nft-image/[tokenId]`) แทน base64

## การ Deploy Contract ใหม่

### ขั้นตอนที่ 1: Deploy Contract ใหม่

```bash
# ใช้ Remix, Hardhat, หรือ Foundry
# Deploy contract ใหม่ด้วย code ที่แก้ไขแล้ว
```

### ขั้นตอนที่ 2: Update Frontend

```typescript
// app/mint/page.tsx
// ไม่ต้องเปลี่ยนอะไร เพราะส่ง IPFS hash ไปแล้ว
const imageData = metadataIpfsHash 
  ? `ipfs://${metadataIpfsHash}` 
  : (ipfsHash ? `ipfs://${ipfsHash}` : imageBase64);
```

### ขั้นตอนที่ 3: Update Contract Address

```typescript
// app/mint/page.tsx หรือ config file
const NFT_CONTRACT_ADDRESS = "0x..."; // Contract address ใหม่
```

## Migration สำหรับ NFTs ที่ mint แล้ว

### NFTs ที่ mint ด้วย contract เดิม

- TokenURI เป็น data URI ที่มี base64 image
- ยังใช้งานได้ปกติ
- Backend API (`/api/nft-metadata`) จะ handle ทั้ง data URI และ IPFS URI

### NFTs ที่ mint ด้วย contract ใหม่

- TokenURI เป็น IPFS hash (`ipfs://QmHash...`)
- Metadata ถูกจัดการโดย backend API
- Image ใช้ canvas art endpoint

## สรุปการเปลี่ยนแปลง

| Aspect | Contract เดิม | Contract ใหม่ |
|--------|--------------|---------------|
| Parameter | `imageBase64` | `metadataIpfsHash` |
| TokenURI | `data:application/json;base64,...` | `ipfs://QmHash...` |
| Gas Cost | สูง (สร้าง JSON + encode) | ต่ำ (แค่เก็บ string) |
| Metadata | Hardcode ใน contract | บน IPFS (ยืดหยุ่น) |
| Image | Base64 data URI | Canvas art endpoint |
| Frontend | ต้องเปลี่ยน | ไม่ต้องเปลี่ยน |

## ข้อดีของการ Migration

1. **ประหยัด Gas** - ไม่ต้องสร้าง JSON ใน contract
2. **ยืดหยุ่น** - Metadata ถูกจัดการโดย backend
3. **รองรับอนาคต** - สามารถเปลี่ยน metadata ได้โดยไม่ต้อง deploy contract ใหม่
4. **มาตรฐาน** - ใช้ IPFS ตามมาตรฐาน ERC-721
5. **Canvas Art** - Image ใช้ canvas art endpoint ที่ generate จาก tokenId

## หมายเหตุ

- Contract นี้เป็น **Upgradeable Contract** ใช้ `Initializable` pattern
- ถ้าต้องการ upgrade contract เดิม แทนที่จะ deploy ใหม่ ต้องใช้ proxy pattern
- แต่ถ้า deploy contract ใหม่ จะต้อง update contract address ใน frontend

