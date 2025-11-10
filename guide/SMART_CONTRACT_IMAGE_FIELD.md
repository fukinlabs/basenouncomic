# Smart Contract: ใช้ image หรือ animation_url สำหรับ Canvas Art?

## คำตอบ: ใช้ `image` field

### เหตุผล

1. **Canvas art เป็น static PNG image** - ไม่ใช่ animation หรือ interactive content
2. **มาตรฐาน ERC-721** - `image` field ใช้สำหรับ static images
3. **NFT Explorers รองรับ** - NFTScan, OpenSea, Basescan ใช้ `image` field เป็นหลัก
4. **Backward Compatibility** - รองรับกับ tools และ marketplaces ที่มีอยู่

## มาตรฐาน ERC-721 Metadata

```json
{
  "name": "NFT Name",
  "description": "NFT Description",
  "image": "https://...",           // ✅ ใช้สำหรับ static image
  "animation_url": "https://...",   // ใช้สำหรับ interactive/animated content
  "attributes": [...]
}
```

### `image` field
- ✅ Static images (PNG, JPG, GIF, SVG)
- ✅ Canvas art ที่ render เป็น PNG
- ✅ รองรับโดย NFT explorers ทั้งหมด
- ✅ แสดงผลใน wallets และ marketplaces

### `animation_url` field
- สำหรับ interactive HTML/Canvas
- สำหรับ animations (MP4, WebM, GIF animated)
- สำหรับ 3D models (GLB, GLTF)
- สำหรับ audio/video content

## Smart Contract Code

### วิธีที่ 1: ใช้ `image` field (แนะนำ)

```solidity
function mintForFid(
    address to,
    uint256 fid,
    string memory metadataIpfsHash
) public {
    require(!mintedFid[fid], "FID already minted");
    require(to != address(0), "Invalid address");
    
    mintedFid[fid] = true;
    uint256 tokenId = nextId++;
    
    // ใช้ IPFS hash เป็น tokenURI
    string memory tokenURI = string(abi.encodePacked("ipfs://", metadataIpfsHash));
    
    _safeMint(to, tokenId);
    _setTokenURI(tokenId, tokenURI);
    
    emit MintForFID(to, tokenId, fid);
}
```

**Metadata JSON (บน IPFS):**
```json
{
  "name": "BaseP5 #123",
  "description": "p5.js generated NFT bound to Farcaster FID 123",
  "image": "https://your-domain.com/api/nft-image/123",
  "attributes": [
    { "trait_type": "FID", "value": "123" }
  ]
}
```

### วิธีที่ 2: ใช้ทั้ง `image` และ `animation_url` (ถ้าต้องการ interactive)

```solidity
// ถ้าต้องการให้ canvas เป็น interactive ในอนาคต
// สามารถเพิ่ม animation_url ได้
```

**Metadata JSON:**
```json
{
  "name": "BaseP5 #123",
  "description": "p5.js generated NFT bound to Farcaster FID 123",
  "image": "https://your-domain.com/api/nft-image/123",
  "animation_url": "https://your-domain.com/api/nft-canvas/123",  // Optional: สำหรับ interactive canvas
  "attributes": [
    { "trait_type": "FID", "value": "123" }
  ]
}
```

## Backend API (ปัจจุบัน)

โค้ดปัจจุบันใช้ `image` field แล้ว:

```typescript
// app/api/upload-pinata/route.ts
const nftMetadata = {
  name: `Base Abstract #${tokenId || fid}`,
  description: `Generative art NFT for Farcaster FID ${fid}`,
  image: ipfsImageUrl,  // ✅ ใช้ image field
  // animation_url: "...",  // ไม่จำเป็นสำหรับ static canvas
  attributes: [...]
};
```

## สรุป

### ✅ ใช้ `image` field เพราะ:
1. Canvas art เป็น **static PNG image**
2. รองรับโดย **NFT explorers** ทั้งหมด
3. **มาตรฐาน ERC-721** กำหนดให้ใช้ `image` สำหรับ static images
4. **Backward compatible** กับ tools และ marketplaces

### ❌ ไม่ใช้ `animation_url` เพราะ:
1. Canvas art ไม่ใช่ animation หรือ interactive content
2. NFT explorers อาจไม่แสดง `animation_url` เป็นหลัก
3. Wallets อาจไม่รองรับ `animation_url`

## ตัวอย่าง Metadata ที่ถูกต้อง

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

## หมายเหตุ

- ถ้าในอนาคตต้องการให้ canvas เป็น **interactive** (เช่น HTML5 Canvas ที่ user สามารถ interact ได้) สามารถเพิ่ม `animation_url` ได้
- แต่สำหรับ static canvas art ควรใช้ `image` field เท่านั้น

