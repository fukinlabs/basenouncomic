# คู่มือการดึง tokenId จาก Smart Contract

## 📋 ภาพรวม

`_uint2str` เป็น **internal function** ใน smart contract ซึ่งหมายความว่า:
- ❌ **ไม่สามารถเรียกจากภายนอก contract ได้**
- ✅ แต่เราสามารถดึง `tokenId` (uint256) จาก contract แล้วแปลงเป็น string ใน TypeScript/JavaScript

---

## 🔍 วิธีที่ 1: ดึง tokenId จาก Mint Event (แนะนำ)

### หลักการ
- อ่าน Mint event จาก blockchain
- ดึง tokenId จาก event args
- แปลง bigint เป็น string

### ตัวอย่างโค้ด

```typescript
import { createPublicClient, http, parseAbiItem, parseEventLogs } from "viem";
import { base } from "viem/chains";

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

// 1. ค้นหา Mint event
const logs = await publicClient.getLogs({
  address: NFT_CONTRACT_ADDRESS,
  event: parseAbiItem("event Mint(address indexed to, uint256 indexed tokenId, uint256 fid)"),
  fromBlock: 0n, // หรือ block ที่ contract deploy
  toBlock: "latest",
});

// 2. Parse event logs
const mintEvents = parseEventLogs({
  abi: [parseAbiItem("event Mint(address indexed to, uint256 indexed tokenId, uint256 fid)")],
  eventName: "Mint",
  logs: logs,
});

// 3. ดึง tokenId และแปลงเป็น string
if (mintEvents.length > 0) {
  const event = mintEvents[0];
  const tokenId = event.args?.tokenId?.toString(); // ✅ แปลง bigint เป็น string
  const fid = event.args?.fid?.toString();
  
  console.log("TokenId:", tokenId); // "0", "1", "2", ...
  console.log("FID:", fid);
}
```

---

## 🔍 วิธีที่ 2: ดึง tokenId โดยใช้ FID (ผ่าน Mint Event)

### ตัวอย่างโค้ด

```typescript
// app/api/nft-by-fid/route.ts
export async function GET(request: NextRequest) {
  const fid = request.nextUrl.searchParams.get("fid");
  
  // 1. ค้นหา Mint event ที่มี FID ตรงกัน
  const logs = await publicClient.getLogs({
    address: NFT_CONTRACT_ADDRESS,
    event: parseAbiItem("event Mint(address indexed to, uint256 indexed tokenId, uint256 fid)"),
    fromBlock: 0n,
    toBlock: "latest",
  });
  
  // 2. Filter logs by FID
  const filteredLogs = logs.filter((log) => {
    const parsed = parseEventLogs({
      abi: [parseAbiItem("event Mint(address indexed to, uint256 indexed tokenId, uint256 fid)")],
      eventName: "Mint",
      logs: [log],
    });
    if (parsed.length > 0) {
      const event = parsed[0] as { args?: { fid?: bigint } };
      return event.args?.fid?.toString() === fid;
    }
    return false;
  });
  
  // 3. ดึง tokenId จาก event
  if (filteredLogs.length > 0) {
    const latestLog = filteredLogs[filteredLogs.length - 1];
    const parsedLogs = parseEventLogs({
      abi: [parseAbiItem("event Mint(address indexed to, uint256 indexed tokenId, uint256 fid)")],
      eventName: "Mint",
      logs: [latestLog],
    });
    
    const event = parsedLogs[0] as { args?: { tokenId?: bigint } };
    const tokenId = event.args?.tokenId?.toString(); // ✅ แปลง bigint เป็น string
    
    return NextResponse.json({ tokenId, fid });
  }
}
```

---

## 🔍 วิธีที่ 3: ดึง tokenId จาก Contract State (ถ้ามี public function)

### ตัวอย่างโค้ด

```typescript
// ถ้า contract มี public function ที่ return tokenId
// เช่น: function getTokenIdByFid(uint256 fid) public view returns (uint256)

const tokenId = await publicClient.readContract({
  address: NFT_CONTRACT_ADDRESS,
  abi: [
    parseAbiItem("function getTokenIdByFid(uint256 fid) view returns (uint256)"),
  ],
  functionName: "getTokenIdByFid",
  args: [BigInt(fid)],
});

// แปลง bigint เป็น string
const tokenIdString = tokenId.toString(); // ✅ "0", "1", "2", ...
```

---

## 🔍 วิธีที่ 4: ดึง tokenId จาก tokenURI Metadata

### ตัวอย่างโค้ด

```typescript
// 1. ดึง tokenURI จาก contract
const tokenURI = await publicClient.readContract({
  address: NFT_CONTRACT_ADDRESS,
  abi: [
    parseAbiItem("function tokenURI(uint256 tokenId) view returns (string)"),
  ],
  functionName: "tokenURI",
  args: [BigInt(tokenId)],
});

// 2. ถ้า tokenURI เป็น base64 JSON
if (tokenURI.startsWith("data:application/json;base64,")) {
  const base64Data = tokenURI.replace("data:application/json;base64,", "");
  const jsonStr = Buffer.from(base64Data, "base64").toString("utf-8");
  const metadata = JSON.parse(jsonStr);
  
  // 3. Extract tokenId จาก metadata.name
  // เช่น: "Farcaster Abtract #0" -> "0"
  const nameMatch = metadata.name.match(/#(\d+)$/);
  if (nameMatch && nameMatch[1]) {
    const tokenIdFromName = nameMatch[1]; // ✅ "0"
    console.log("TokenId from metadata.name:", tokenIdFromName);
  }
}
```

---

## 📝 ตัวอย่างการใช้งานจริง

### ตัวอย่าง 1: ดึง tokenId จาก Mint Event (ใช้ใน API Route)

```typescript
// app/api/nft-by-fid/route.ts
import { createPublicClient, http, parseAbiItem, parseEventLogs } from "viem";
import { base } from "viem/chains";

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

export async function GET(request: NextRequest) {
  const fid = request.nextUrl.searchParams.get("fid");
  
  // ค้นหา Mint event
  const logs = await publicClient.getLogs({
    address: NFT_CONTRACT_ADDRESS,
    event: parseAbiItem("event Mint(address indexed to, uint256 indexed tokenId, uint256 fid)"),
    fromBlock: 0n,
    toBlock: "latest",
  });
  
  // Filter และ parse
  const filteredLogs = logs.filter((log) => {
    const parsed = parseEventLogs({
      abi: [parseAbiItem("event Mint(address indexed to, uint256 indexed tokenId, uint256 fid)")],
      eventName: "Mint",
      logs: [log],
    });
    if (parsed.length > 0) {
      const event = parsed[0] as { args?: { fid?: bigint } };
      return event.args?.fid?.toString() === fid;
    }
    return false;
  });
  
  if (filteredLogs.length > 0) {
    const latestLog = filteredLogs[filteredLogs.length - 1];
    const parsedLogs = parseEventLogs({
      abi: [parseAbiItem("event Mint(address indexed to, uint256 indexed tokenId, uint256 fid)")],
      eventName: "Mint",
      logs: [latestLog],
    });
    
    const event = parsedLogs[0] as { args?: { tokenId?: bigint; fid?: bigint } };
    const tokenId = event.args?.tokenId?.toString(); // ✅ bigint -> string
    const eventFid = event.args?.fid?.toString();
    
    return NextResponse.json({
      fid,
      tokenId, // ✅ string
      minted: true,
    });
  }
  
  return NextResponse.json(
    { error: "NFT not found for this FID" },
    { status: 404 }
  );
}
```

### ตัวอย่าง 2: ดึง tokenId ใน Frontend (React)

```typescript
// app/mint/page.tsx
"use client";

import { useReadContract } from "wagmi";
import { parseEventLogs } from "viem";

export default function MintPage() {
  const { data: hash } = useWriteContract();
  const { data: receipt } = useWaitForTransactionReceipt({ hash });
  
  useEffect(() => {
    if (receipt) {
      // Parse Mint event จาก transaction receipt
      const mintEvents = parseEventLogs({
        abi: contractABI,
        eventName: "Mint",
        logs: receipt.logs,
      });
      
      if (mintEvents.length > 0) {
        const event = mintEvents[0];
        const eventArgs = event.args as { tokenId?: bigint; fid?: bigint };
        const tokenId = eventArgs?.tokenId?.toString(); // ✅ bigint -> string
        
        console.log("Minted tokenId:", tokenId); // "0", "1", "2", ...
        setMintedTokenId(tokenId);
      }
    }
  }, [receipt]);
}
```

---

## 🔄 การแปลง BigInt เป็น String

### วิธีที่ 1: ใช้ `.toString()` (แนะนำ)

```typescript
const tokenId: bigint = 123n;
const tokenIdString = tokenId.toString(); // ✅ "123"
```

### วิธีที่ 2: ใช้ `String()`

```typescript
const tokenId: bigint = 123n;
const tokenIdString = String(tokenId); // ✅ "123"
```

### วิธีที่ 3: ใช้ Template Literal

```typescript
const tokenId: bigint = 123n;
const tokenIdString = `${tokenId}`; // ✅ "123"
```

---

## 📊 สรุป

| วิธี | ข้อดี | ข้อเสีย | ใช้เมื่อ |
|------|-------|---------|---------|
| **Mint Event** | ✅ ถูกต้อง, ได้ tokenId จริง | ต้องค้นหา event | ✅ **แนะนำ** - ใช้เมื่อต้องการ tokenId จาก FID |
| **Contract State** | เร็ว, ไม่ต้องค้นหา event | ต้องมี public function | ใช้เมื่อ contract มี function สำหรับดึง tokenId |
| **tokenURI Metadata** | ได้ข้อมูลเพิ่มเติม | ต้อง parse JSON | ใช้เมื่อต้องการข้อมูล metadata ด้วย |

---

## ⚠️ หมายเหตุ

1. **`_uint2str` เป็น internal function** - ไม่สามารถเรียกจากภายนอก contract ได้
2. **ใช้ `.toString()`** เพื่อแปลง bigint เป็น string ใน TypeScript/JavaScript
3. **tokenId จาก Mint event** เป็นวิธีที่ถูกต้องที่สุด เพราะมาจาก contract โดยตรง

---

## 🔗 เอกสารอ้างอิง

- [Viem Documentation - parseEventLogs](https://viem.sh/docs/utilities/parseEventLogs)
- [Viem Documentation - getLogs](https://viem.sh/docs/actions/public/getLogs)
- [Solidity - Internal Functions](https://docs.soliditylang.org/en/latest/contracts.html#visibility-and-getters)

