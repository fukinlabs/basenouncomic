# Guide: แปลง p5-art-generator.ts เป็น On-Chain SVG (แบบ Nouns)

## 🎯 เป้าหมาย

แปลงจาก:
- ❌ HTML Canvas (IPFS storage)
- ❌ Frontend generation (p5.js)
- ❌ External storage (Pinata/IPFS)

เป็น:
- ✅ On-Chain SVG (smart contract)
- ✅ Smart contract generation
- ✅ 100% on-chain (ไม่ต้องใช้ external storage)

---

## 📊 ขั้นตอนการแปลง

### Step 1: แปลง Canvas API → SVG

**ปัจจุบัน (Canvas API):**
```typescript
// lib/p5-art-generator.ts
ctx.fillRect(-this.w / 2, -this.w / 2, this.w, this.w);
ctx.beginPath();
ctx.arc(0, 0, this.w * 0.15, 0, Math.PI * 2);
ctx.fill();
```

**แปลงเป็น SVG:**
```typescript
// SVG equivalent
<rect x="-50" y="-50" width="100" height="100" fill="#0000FF"/>
<circle cx="0" cy="0" r="15" fill="#FF0000"/>
```

---

### Step 2: สร้าง SVG Generator Function

**สร้างไฟล์ใหม่: `lib/svg-art-generator.ts`:**

```typescript
// lib/svg-art-generator.ts
export interface SVGArtConfig {
  tokenId: string;
  seed?: number;
}

// Seeded random (same as p5-art-generator.ts)
class SeededRandom {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  random(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  randomInt(max: number): number {
    return Math.floor(this.random() * max);
  }
  randomChoice<T>(array: T[]): T {
    return array[this.randomInt(array.length)];
  }
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

// SVG Shape class
class SVGShape {
  x: number;
  y: number;
  w: number;
  clrs: string[];
  scaleX: number;
  angle: number;
  form: number;
  rng: SeededRandom;

  constructor(x: number, y: number, w: number, f: number, colors: string[], rng: SeededRandom) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.clrs = [...colors];
    this.rng = rng;
    
    if (f === 8) {
      this.scaleX = -1;
      this.angle = 0;
    } else {
      this.scaleX = rng.random() < 0.5 ? -1 : 1;
      this.angle = rng.randomInt(4) * (Math.PI * 2 / 4);
    }
    
    this.clrs = rng.shuffle(this.clrs);
    this.form = f;
  }

  // Convert to SVG string
  toSVG(): string {
    const transform = `translate(${this.x},${this.y}) scale(${this.scaleX},1) rotate(${this.angle * 180 / Math.PI})`;
    const remainingColors = this.clrs.slice(1);
    
    let svg = `<g transform="${transform}">`;
    
    // Base square
    svg += `<rect x="${-this.w / 2}" y="${-this.w / 2}" width="${this.w}" height="${this.w}" fill="${this.clrs[0]}"/>`;
    
    if (this.form === 0) {
      // Form 0: Leaf + Circle
      svg += `<path d="M ${-this.w / 2} ${-this.w / 2} A ${this.w * 0.5} ${this.w * 0.5} 0 0 1 ${this.w / 2} ${-this.w / 2} A ${this.w * 0.5} ${this.w * 0.5} 0 0 1 ${-this.w / 2} ${this.w / 2} Z" fill="${remainingColors[0] || this.clrs[1]}"/>`;
      svg += `<circle cx="0" cy="0" r="${this.w * 0.15}" fill="${remainingColors[1] || this.clrs[2]}"/>`;
    } else if (this.form === 1) {
      // Form 1: Creative explosion
      svg += `<circle cx="0" cy="0" r="${this.w * 0.3}" fill="${this.clrs[0]}"/>`;
      for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 / 5) * i;
        const x = Math.cos(angle) * this.w * 0.4;
        const y = Math.sin(angle) * this.w * 0.4;
        svg += `<path d="M 0 0 L ${x} ${y} A ${this.w * 0.2} ${this.w * 0.2} 0 0 1 0 0 Z" fill="${this.clrs[(i + 1) % this.clrs.length]}"/>`;
      }
    } else if (this.form === 2) {
      // Form 2: Rectangles + Ellipse
      svg += `<rect x="${-this.w * 0.25 - this.w * 0.15 / 2}" y="${this.w * 0.25 - this.w * 0.15 / 2}" width="${this.w * 0.15}" height="${this.w * 0.15}" fill="${remainingColors[0]}"/>`;
      svg += `<ellipse cx="${this.w * 0.2}" cy="0" rx="${this.w * 0.3 / 2}" ry="${this.w * 0.7 / 2}" fill="${remainingColors[1]}"/>`;
    } else if (this.form === 3) {
      // Form 3: Grid pattern
      svg += `<rect x="${-this.w * 0.35}" y="${-this.w * 0.35}" width="${this.w * 0.7}" height="${this.w * 0.7}" fill="${remainingColors[0]}"/>`;
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          const x = (i * this.w / 8) - (this.w / 4) + (this.w / 8 / 4);
          const y = (j * this.w / 8) - (this.w / 4) + (this.w / 8 / 4);
          svg += `<circle cx="${x}" cy="${y}" r="${this.w / 8 * 0.2}" fill="${remainingColors[1]}"/>`;
        }
      }
    } else if (this.form === 4) {
      // Form 4: Circles around center
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const x = this.w * 0.25 * Math.cos(a);
        const y = this.w * 0.25 * Math.sin(a);
        svg += `<circle cx="${x}" cy="${y}" r="${this.w * 0.05}" fill="${i % 2 === 0 ? remainingColors[0] : remainingColors[1]}"/>`;
      }
      svg += `<circle cx="0" cy="0" r="${this.w * 0.05}" fill="${remainingColors[2] || this.clrs[0]}"/>`;
    } else if (this.form === 5) {
      // Form 5: Rounded rectangle + Circle
      svg += `<rect x="${-this.w * 0.125}" y="${-this.w * 0.125}" width="${this.w * 0.25}" height="${this.w * 0.25}" rx="${this.w * 0.5}" fill="${remainingColors[0]}"/>`;
      svg += `<circle cx="${this.w * 0.1}" cy="${this.w * 0.1}" r="${this.w * 0.15}" fill="${remainingColors[1]}"/>`;
    } else if (this.form === 6) {
      // Form 6: 6-petal flower
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const x = Math.sin(angle) * this.w * 0.15;
        const y = -Math.cos(angle) * this.w * 0.15;
        svg += `<ellipse cx="${x}" cy="${y}" rx="${this.w * 0.12}" ry="${this.w * 0.25}" transform="rotate(${angle * 180 / Math.PI})" fill="${remainingColors[0]}"/>`;
      }
      svg += `<circle cx="0" cy="0" r="${this.w * 0.12}" fill="${remainingColors[1]}"/>`;
      svg += `<circle cx="0" cy="0" r="${this.w * 0.04}" fill="${this.clrs[0]}"/>`;
    } else if (this.form === 7) {
      // Form 7: Dynamic balance
      svg += `<ellipse cx="0" cy="0" rx="${this.w * 0.45}" ry="${this.w * 0.27}" fill="none" stroke="#00ff99" stroke-width="3"/>`;
      svg += `<ellipse cx="0" cy="0" rx="${this.w * 0.27}" ry="${this.w * 0.45}" fill="none" stroke="#ff4b4b" stroke-width="3"/>`;
      svg += `<circle cx="0" cy="0" r="${this.w * 0.25}" fill="${this.clrs[1] || this.clrs[0]}"/>`;
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 / 6) * i;
        const x = Math.cos(angle) * this.w * 0.35;
        const y = Math.sin(angle) * this.w * 0.35;
        svg += `<circle cx="${x}" cy="${y}" r="${this.w * 0.06}" fill="#ffffff"/>`;
      }
    } else if (this.form === 8) {
      // Form 8: Noggles
      const s = this.w * 0.5;
      svg += `<g transform="scale(-1,1)">`;
      svg += `<rect x="${-s * 0.3 - s * 0.6 / 2}" y="${-s * 0.6 / 2}" width="${s * 0.6}" height="${s * 0.6}" fill="${this.clrs[1] || this.clrs[0]}"/>`;
      svg += `<rect x="${s * 0.45 - s * 0.6 / 2}" y="${-s * 0.6 / 2}" width="${s * 0.6}" height="${s * 0.6}" fill="${this.clrs[1] || this.clrs[0]}"/>`;
      svg += `<rect x="${-s * 0.8 - 4}" y="${s * 0.07 - 4}" width="8" height="8" fill="${this.clrs[1] || this.clrs[0]}"/>`;
      svg += `<rect x="${-s * 0.7 - s * 0.3 / 2}" y="${-s * 0.1 / 2}" width="${s * 0.3}" height="${s * 0.1}" fill="${this.clrs[1] || this.clrs[0]}"/>`;
      svg += `<rect x="${0.7 - s * 0.5 / 2}" y="${-s * 0.1 / 2}" width="${s * 0.5}" height="${s * 0.1}" fill="${this.clrs[1] || this.clrs[0]}"/>`;
      svg += `<rect x="${-s * 0.25 - s * 0.3 / 2}" y="${0.05 - s * 0.3 / 2}" width="${s * 0.3}" height="${s * 0.3}" fill="#111111"/>`;
      svg += `<rect x="${s * 0.5 - s * 0.3 / 2}" y="${0.05 - s * 0.3 / 2}" width="${s * 0.3}" height="${s * 0.3}" fill="#111111"/>`;
      svg += `<rect x="${-s * 0.35 - s * 0.2 / 2}" y="${-s * 0.3 / 2}" width="${s * 0.2}" height="${s * 0.3}" fill="#ffffff"/>`;
      svg += `<rect x="${s * 0.4 - s * 0.2 / 2}" y="${-s * 0.3 / 2}" width="${s * 0.2}" height="${s * 0.3}" fill="#ffffff"/>`;
      svg += `</g>`;
    }
    
    svg += `</g>`;
    return svg;
  }
}

export function generateSVGArt(config: SVGArtConfig): string {
  const colors = ['#0000FF', '#FF0000', '#ff6392', '#FCBA3A', '#000000', '#f0f0f0'];
  const seed = parseInt(config.tokenId) || 0;
  const rng = new SeededRandom(seed);

  const cellCount = 3;
  const width = 600;
  const height = 600;
  const gridArea = Math.min(width, height) * 0.75;
  const cellSize = gridArea / cellCount;
  const w = cellSize;

  // Generate numbers array and shuffle
  const numbers: number[] = [];
  for (let i = 0; i < cellCount * cellCount; i++) {
    numbers.push(i);
  }
  const shuffledNumbers = rng.shuffle(numbers);

  const shapes: SVGShape[] = [];
  let count = 0;
  for (let j = 0; j < cellCount; j++) {
    for (let i = 0; i < cellCount; i++) {
      const x = i * cellSize + (cellSize / 2) + (width - gridArea) / 2;
      const y = j * cellSize + (cellSize / 2) + (height - gridArea) / 2;
      shapes.push(new SVGShape(x, y, w, shuffledNumbers[count], colors, rng));
      count++;
    }
  }

  // Build SVG
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="${width}" height="${height}" fill="#E3E3E3"/>`;
  
  for (const shape of shapes) {
    svg += shape.toSVG();
  }
  
  svg += `</svg>`;
  return svg;
}
```

---

### Step 3: สร้าง Smart Contract สำหรับ SVG Generation

**สร้างไฟล์ใหม่: `contracts/SVGArtNFT.sol`:**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SVGArtNFT is ERC721, Ownable {
    uint256 private _nextTokenId;
    
    // Colors array
    string[] private colors = [
        "#0000FF", "#FF0000", "#ff6392", 
        "#FCBA3A", "#000000", "#f0f0f0"
    ];
    
    constructor(address initialOwner) ERC721("SVG Art NFT", "SVGART") Ownable(initialOwner) {}
    
    function mint() public {
        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
    }
    
    // Seeded random (simplified version)
    function random(uint256 seed, uint256 nonce) private pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(seed, nonce)));
    }
    
    // Generate SVG for token
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        string memory svg = generateSVG(tokenId);
        string memory json = string(abi.encodePacked(
            '{"name":"SVG Art #', toString(tokenId), '",',
            '"description":"On-chain generated SVG art",',
            '"image":"data:image/svg+xml;base64,', base64Encode(bytes(svg)), '",',
            '"attributes":[]}'
        ));
        
        return string(abi.encodePacked(
            "data:application/json;base64,",
            base64Encode(bytes(json))
        ));
    }
    
    // Generate SVG (simplified - only form 0 for example)
    function generateSVG(uint256 tokenId) private view returns (string memory) {
        uint256 seed = tokenId;
        uint256 nonce = 0;
        
        string memory svg = '<svg width="600" height="600" xmlns="http://www.w3.org/2000/svg">';
        svg = string(abi.encodePacked(svg, '<rect width="600" height="600" fill="#E3E3E3"/>'));
        
        // Generate 3x3 grid (simplified)
        for (uint256 i = 0; i < 9; i++) {
            uint256 x = (i % 3) * 200 + 100;
            uint256 y = (i / 3) * 200 + 100;
            uint256 form = random(seed, nonce++) % 9;
            
            svg = string(abi.encodePacked(svg, generateShape(x, y, 150, form, seed, nonce++)));
        }
        
        svg = string(abi.encodePacked(svg, '</svg>'));
        return svg;
    }
    
    // Generate shape SVG (simplified - only form 0)
    function generateShape(uint256 x, uint256 y, uint256 w, uint256 form, uint256 seed, uint256 nonce) private view returns (string memory) {
        uint256 colorIndex = random(seed, nonce) % colors.length;
        string memory color = colors[colorIndex];
        
        if (form == 0) {
            // Form 0: Square + Circle
            return string(abi.encodePacked(
                '<g transform="translate(', toString(x), ',', toString(y), ')">',
                '<rect x="', toString(-int256(w)/2), '" y="', toString(-int256(w)/2), '" width="', toString(w), '" height="', toString(w), '" fill="', color, '"/>',
                '<circle cx="0" cy="0" r="', toString(w * 15 / 100), '" fill="', colors[(colorIndex + 1) % colors.length], '"/>',
                '</g>'
            ));
        }
        // Add more forms...
        return '';
    }
    
    // Helper functions
    function toString(uint256 value) private pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits--;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
    
    function toString(int256 value) private pure returns (string memory) {
        if (value < 0) {
            return string(abi.encodePacked("-", toString(uint256(-value))));
        }
        return toString(uint256(value));
    }
    
    function base64Encode(bytes memory data) private pure returns (string memory) {
        // Simplified base64 encoding (use library in production)
        // For production, use OpenZeppelin's Base64 library
        return ""; // Placeholder
    }
}
```

---

### Step 4: ข้อจำกัดและข้อควรระวัง

#### ⚠️ Contract Size Limit
- **Ethereum:** 24 KB (24,576 bytes)
- **Base:** Similar limit
- **ปัญหา:** SVG generation logic อาจทำให้ contract ใหญ่เกินไป

#### ⚠️ Gas Cost
- **SVG generation:** ใช้ gas เมื่อเรียก `tokenURI()`
- **Complex SVG:** ใช้ gas สูง
- **แนะนำ:** ใช้ simplified version หรือ off-chain generation

#### ⚠️ SVG Complexity
- **Canvas API:** รองรับ complex shapes
- **SVG:** จำกัดเฉพาะ basic shapes
- **ปัญหา:** บาง forms อาจแปลงยาก

---

## 🎯 ทางเลือก: Hybrid Approach

### Option 1: On-Chain Seed + Off-Chain Generation
```solidity
// Smart contract: เก็บ seed เท่านั้น
mapping(uint256 => uint256) public seeds;

function mint() public {
    uint256 tokenId = _nextTokenId++;
    seeds[tokenId] = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, tokenId)));
    _safeMint(msg.sender, tokenId);
}
```

```typescript
// Frontend: Generate SVG จาก seed
const seed = await contract.seeds(tokenId);
const svg = generateSVGArt({ tokenId: tokenId.toString(), seed });
```

**ข้อดี:**
- ✅ Contract เล็ก (เก็บเฉพาะ seed)
- ✅ Gas cost ต่ำ
- ✅ รองรับ complex SVG

**ข้อเสีย:**
- ⚠️ ต้อง generate SVG ที่ frontend
- ⚠️ ไม่ใช่ 100% on-chain

---

### Option 2: On-Chain SVG (Simplified)
```solidity
// Smart contract: Generate simplified SVG
function generateSVG(uint256 tokenId) private view returns (string memory) {
    // Simplified version (only basic shapes)
    // ...
}
```

**ข้อดี:**
- ✅ 100% on-chain
- ✅ ไม่ต้องพึ่งพา external storage

**ข้อเสีย:**
- ⚠️ Contract ใหญ่ (อาจเกิน limit)
- ⚠️ Gas cost สูง
- ⚠️ SVG จำกัด (simplified version)

---

## ✅ สรุปและคำแนะนำ

### สำหรับโปรเจคนี้:

**ไม่แนะนำ:** แปลงเป็น On-Chain SVG แบบ Nouns
- ⚠️ Art ซับซ้อน (HTML canvas, 9 forms)
- ⚠️ Contract size limit
- ⚠️ Gas cost สูง

**แนะนำ:** ใช้วิธีปัจจุบัน (IPFS HTML)
- ✅ รองรับ complex art
- ✅ Gas cost ปานกลาง
- ✅ ไม่ต้องกังวลเรื่อง contract size

### ถ้าต้องการทำ On-Chain SVG:

**แนะนำ:** ใช้ Hybrid Approach
1. เก็บ seed บน smart contract
2. Generate SVG ที่ frontend จาก seed
3. Cache SVG ที่ IPFS (optional)

**หรือ:** ใช้ Simplified SVG
1. ลดจำนวน forms (9 → 3-4 forms)
2. ใช้ basic shapes เท่านั้น
3. Generate SVG ที่ smart contract

---

## 📝 Checklist

- [ ] แปลง Canvas API → SVG
- [ ] สร้าง SVG generator function
- [ ] สร้าง smart contract สำหรับ SVG generation
- [ ] ทดสอบ contract size (ต้อง < 24 KB)
- [ ] ทดสอบ gas cost
- [ ] Deploy และ test

---

## 🔗 References

- [Nouns.wtf](https://nouns.wtf/)
- [OpenZeppelin Base64](https://docs.openzeppelin.com/contracts/4.x/utilities#base64)
- [SVG Specification](https://www.w3.org/TR/SVG2/)

