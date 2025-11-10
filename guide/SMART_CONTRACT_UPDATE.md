# Smart Contract Update Guide

## ปัญหาปัจจุบัน

Smart contract สร้าง metadata JSON ที่มี image เป็น base64:
```solidity
string memory json = string(
    abi.encodePacked(
        '{"name":"BaseP5 #', _uint2str(fid),
        '", "description":"p5.js generated NFT bound to Farcaster FID ', _uint2str(fid),
        '","attributes":[{"trait_type":"FID","value":"', _uint2str(fid), '"}],',
        '"image":"data:image/png;base64,', imageBase64, '"}'
    )
);
```

## วิธีแก้ไข

### วิธีที่ 1: ใช้ IPFS Hash ของ Metadata (แนะนำ)

**เปลี่ยน contract ให้รับ IPFS hash แทน base64:**

```solidity
function mintForFid(
    address to,
    uint256 fid,
    string memory metadataIpfsHash  // เปลี่ยนจาก imageBase64 เป็น metadataIpfsHash
) public {
    require(!mintedFid[fid], "FID already minted");
    require(to != address(0), "Invalid address");
    
    mintedFid[fid] = true;
    uint256 tokenId = nextId++;
    
    // ใช้ IPFS hash โดยตรงเป็น tokenURI
    string memory tokenURI = string(abi.encodePacked("ipfs://", metadataIpfsHash));
    
    _safeMint(to, tokenId);
    _setTokenURI(tokenId, tokenURI);
    
    emit MintForFID(to, tokenId, fid);
}
```

**ข้อดี:**
- ไม่ต้องสร้าง JSON metadata ใน contract (ประหยัด gas)
- Metadata ถูกจัดการโดย backend API
- รองรับการเปลี่ยนแปลง metadata ในอนาคต
- ใช้กับโค้ดปัจจุบันได้เลย

### วิธีที่ 2: ใช้ Canvas Art Endpoint URL

**ถ้าต้องการให้ contract สร้าง metadata เอง แต่ใช้ canvas endpoint:**

```solidity
function mintForFid(
    address to,
    uint256 fid,
    string memory imageBase64  // ยังรับ base64 แต่จะไม่ใช้
) public {
    require(!mintedFid[fid], "FID already minted");
    require(to != address(0), "Invalid address");
    
    mintedFid[fid] = true;
    uint256 tokenId = nextId++;
    
    // สร้าง metadata ที่ใช้ canvas art endpoint
    // ต้อง hardcode domain หรือใช้ variable
    string memory baseUrl = "https://your-domain.com"; // หรือใช้ state variable
    string memory json = string(
        abi.encodePacked(
            '{"name":"BaseP5 #', _uint2str(fid),
            '", "description":"p5.js generated NFT bound to Farcaster FID ', _uint2str(fid),
            '","attributes":[{"trait_type":"FID","value":"', _uint2str(fid), '"}],',
            '"image":"', baseUrl, '/api/nft-image/', _uint2str(tokenId), '"}'
        )
    );
    
    // Upload JSON to IPFS (ต้องมี function สำหรับ upload)
    // หรือ return JSON เป็น data URI
    string memory tokenURI = string(abi.encodePacked("data:application/json;base64,", _base64Encode(bytes(json))));
    
    _safeMint(to, tokenId);
    _setTokenURI(tokenId, tokenURI);
    
    emit MintForFID(to, tokenId, fid);
}
```

**ข้อเสีย:**
- ต้อง hardcode domain หรือใช้ state variable
- ต้องมี function สำหรับ base64 encoding
- ไม่ยืดหยุ่นเท่าวิธีที่ 1

## แนะนำ: ใช้วิธีที่ 1

### การเปลี่ยนแปลงใน Frontend

Frontend ส่ง `metadataIpfsHash` ไปยัง contract แล้ว (บรรทัด 428-430 ใน `app/mint/page.tsx`):

```typescript
const imageData = metadataIpfsHash 
  ? `ipfs://${metadataIpfsHash}` 
  : (ipfsHash ? `ipfs://${ipfsHash}` : imageBase64);
```

### Smart Contract Code (แนะนำ)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BaseP5NFT is ERC721URIStorage, Ownable {
    uint256 private nextId = 1;
    mapping(uint256 => bool) public mintedFid;
    
    event MintForFID(address indexed to, uint256 indexed tokenId, uint256 fid);
    
    constructor(address initialOwner) ERC721("BaseP5", "BP5") Ownable(initialOwner) {}
    
    function mintForFid(
        address to,
        uint256 fid,
        string memory metadataIpfsHash  // รับ IPFS hash ของ metadata
    ) public {
        require(!mintedFid[fid], "FID already minted");
        require(to != address(0), "Invalid address");
        
        mintedFid[fid] = true;
        uint256 tokenId = nextId++;
        
        // ใช้ IPFS hash โดยตรงเป็น tokenURI
        // Format: ipfs://QmHash...
        string memory tokenURI = string(abi.encodePacked("ipfs://", metadataIpfsHash));
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        emit MintForFID(to, tokenId, fid);
    }
    
    // Helper function สำหรับ convert uint256 เป็น string (ถ้ายังไม่มี)
    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k-1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
}
```

## สรุป

1. **เปลี่ยน parameter** จาก `imageBase64` เป็น `metadataIpfsHash`
2. **ใช้ IPFS hash โดยตรง** เป็น `tokenURI` แทนการสร้าง JSON metadata
3. **Backend API** จะจัดการ metadata และ image URL ให้
4. **Frontend** ส่ง `ipfs://${metadataIpfsHash}` ไปยัง contract แล้ว

## ข้อดีของการใช้ IPFS Hash

- ✅ ประหยัด gas (ไม่ต้องสร้าง JSON ใน contract)
- ✅ Metadata ถูกจัดการโดย backend (ยืดหยุ่นกว่า)
- ✅ รองรับการเปลี่ยนแปลง metadata ในอนาคต
- ✅ ใช้กับโค้ดปัจจุบันได้เลย (frontend ส่ง IPFS hash แล้ว)

