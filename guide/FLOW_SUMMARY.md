# สรุป Flow การใช้งานแอป NFT

## 📱 ขั้นตอนทั้งหมดตั้งแต่เปิดแอป

### 1. **เปิดแอป (Splash Screen)**
   - **ไฟล์:** `app/page.tsx`
   - **ขั้นตอน:**
     1. แสดง splash screen พร้อม background GIF (`/monkey.gif`)
     2. โหลดภาพ background (timeout 3 วินาที)
     3. เรียก `sdk.actions.ready()` เพื่อซ่อน splash screen
     4. Redirect ไปที่ `/mint` อัตโนมัติ (ถ้าเปิดใน Mini App)

### 2. **หน้า Mint NFT (`/mint`)**
   - **ไฟล์:** `app/mint/page.tsx`
   - **ขั้นตอน:**
     
     **2.1 ตรวจสอบสถานะการ Login**
     - ตรวจสอบ `localStorage` สำหรับ:
       - `farcaster_signed_out` (ถ้าเป็น `true` = signed out)
       - `farcaster_signed_in` (ถ้าเป็น `true` = signed in)
       - `farcaster_fid` (FID ของผู้ใช้)
       - `farcaster_address` (address จาก Sign In)
     
     **2.2 แสดง Sign In Button (ถ้ายังไม่ได้ login)**
     - ปุ่ม "Sign In with Farcaster"
     - เมื่อคลิก → เรียก `sdk.actions.signIn()`
     - ได้ `message` และ `signature` จาก SDK
     - ส่งไปที่ `/api/verify-signin` เพื่อ verify
     - ถ้าสำเร็จ → บันทึก `fid` และ `address` ใน `localStorage`
     - แสดงข้อความ "Signed in with Farcaster" (fade out 3 วินาที)
     
     **2.3 ตรวจสอบว่า FID ถูก mint แล้วหรือยัง**
     - เรียก `/api/nft-by-fid?fid={fid}` เพื่อหา `tokenId`
     - ถ้าเจอ → แสดง "View NFT →" button
     - ถ้าไม่เจอ → แสดง "MINT" button
     
     **2.4 Generate Art Preview**
     - ใช้ `generateArt()` จาก `lib/p5-art-generator.ts`
     - Seed = `fid` (สำหรับ preview)
     - แสดงบน canvas ขนาด 600x600
     - แปลงเป็น base64 สำหรับส่งไป mint
     
     **2.5 Mint NFT**
     - คลิกปุ่ม "MINT"
     - อ่าน `nextId()` จาก contract เพื่อ predict `tokenId`
     - เรียก `mint()` function ใน smart contract:
       ```solidity
       mint(address to, uint256 fid, string imageBase64, string externalUrl)
       ```
     - Parameters:
       - `to`: address จาก Farcaster Sign In (`signInAddress`)
       - `fid`: FID ของผู้ใช้
       - `imageBase64`: base64 ของ art ที่ generate
       - `externalUrl`: URL ของ NFT page (`/mint/{tokenId}`)
     - รอ transaction confirmation
     - Parse `Mint` event เพื่อหา `tokenId` ที่ mint ได้
     - บันทึก `mintedTokenId` ใน state
     - Upload image และ metadata ไป Pinata IPFS (optional)
     
     **2.6 หลัง Mint สำเร็จ**
     - แสดง "View NFT →" button
     - แสดง "View Gallery →" button
     - Link ไปที่ `/mint/{tokenId}`

### 3. **หน้า View NFT (`/mint/[tokenId]`)**
   - **ไฟล์:** `app/mint/[tokenId]/NFTViewClient.tsx`
   - **ขั้นตอน:**
     
     **3.1 Fetch Metadata**
     - เรียก `/api/nft-metadata?tokenId={tokenId}`
     - ถ้า 404 → ลองใช้ `tokenId` เป็น `FID` เพื่อหา actual `tokenId`
     - ถ้ายังไม่เจอ → แสดง 404 page (`error404.png`)
     
     **3.2 Extract FID จาก Metadata**
     - Parse `tokenURI` จาก contract (base64 JSON)
     - Extract `FID` จาก `attributes` array
     
     **3.3 Generate Art**
     - ใช้ `ArtGenerator` component
     - Seed = `fid || tokenId` (ใช้ FID ถ้ามี, ไม่งั้นใช้ tokenId)
     - แสดงบน canvas 600x600
     
     **3.4 Fetch Owner และ Farcaster User Data**
     - เรียก `/api/nft-check?tokenId={tokenId}` เพื่อหา owner address
     - เรียก `/api/farcaster-user?fid={fid}` เพื่อหา user info (username, displayName, avatar)
     - ใช้ `Promise.all()` เพื่อเรียก parallel
     
     **3.5 แสดงข้อมูล NFT**
     - Name, Description จาก metadata
     - FID และ TOKEN ID display boxes
     - Creator/Owner Info (name, address)
     - Attributes (FID, Token ID)
     - Description section
     - Share buttons (Farcaster, Twitter, Copy Link)
     - "View Gallery" button

### 4. **หน้า Gallery (`/gallery`)**
   - **ไฟล์:** `app/gallery/page.tsx`
   - **ขั้นตอน:**
     
     **4.1 Fetch NFT List**
     - เรียก `/api/nft-list?limit=5&offset=0` (แสดง 5 รายการแรก)
     - API จะ:
       1. อ่าน `nextId()` จาก contract เพื่อหา total supply
       2. Loop จาก `tokenId = 0` ถึง `nextId - 1`
       3. เรียก `ownerOf(tokenId)` เพื่อตรวจสอบว่า NFT มีอยู่จริง
       4. เรียก `tokenURI(tokenId)` เพื่อ extract `FID` จาก metadata
       5. Return array ของ NFTs พร้อม `tokenId`, `owner`, `fid`
     
     **4.2 Fetch Metadata สำหรับแต่ละ NFT**
     - เรียก `/api/nft-metadata?tokenId={tokenId}` สำหรับแต่ละ NFT
     - Extract `name`, `description`, `attributes`, `image`
     
     **4.3 Render NFT Cards**
     - แต่ละ card แสดง:
       - Token ID และ FID
       - Farcaster user info (avatar, username, displayName)
       - NFT name และ description
       - Canvas art (generate ด้วย `fid || tokenId` เป็น seed)
       - Attributes
       - "View Full Details →" button
     
     **4.4 Load More**
     - คลิก "Load More" → เพิ่ม `offset` และ fetch NFTs เพิ่ม
     
     **4.5 Search Function**
     - ค้นหาด้วย Token ID หรือ FID
     - ถ้าเป็นตัวเลข → ลองหาโดย Token ID ก่อน, ถ้าไม่เจอ → ลองหาโดย FID
     - แสดงผลแบบ detailed view (เหมือน NFTViewClient)
     - มี share buttons และ "View Full Page →" button

### 5. **Header Component (ทุกหน้า)**
   - **ไฟล์:** `app/components/Header.tsx`
   - **ขั้นตอน:**
     
     **5.1 ตรวจสอบสถานะ Login**
     - อ่าน `localStorage` สำหรับ `farcaster_signed_out`, `farcaster_signed_in`, `farcaster_fid`
     - ถ้า signed in → แสดง user profile menu (avatar, dropdown)
     - ถ้า signed out → แสดง "Sign In" button
     
     **5.2 User Profile Menu**
     - แสดง avatar (จาก Farcaster API หรือ fallback)
     - แสดง FID
     - Dropdown menu:
       - "Sign Out" button → ล้าง `localStorage` และ redirect ไป `/mint`

## 🔄 Flow Diagram

```
เปิดแอป
  ↓
Splash Screen (page.tsx)
  ↓
Redirect → /mint
  ↓
ตรวจสอบ Login Status
  ├─ Signed Out → แสดง "Sign In" button
  │                 ↓
  │              Sign In with Farcaster
  │                 ↓
  │              Verify Signature (/api/verify-signin)
  │                 ↓
  │              บันทึก fid, address ใน localStorage
  │                 ↓
  └─ Signed In → ตรวจสอบว่า mint แล้วหรือยัง
                    ├─ Mint แล้ว → แสดง "View NFT →" button
                    │                ↓
                    │              ไปที่ /mint/{tokenId}
                    │                ↓
                    │              View NFT Page
                    │
                    └─ ยังไม่ mint → Generate Art Preview
                                      ↓
                                   คลิก "MINT"
                                      ↓
                                   Mint Contract
                                      ↓
                                   Upload to Pinata (optional)
                                      ↓
                                   แสดง "View NFT →" button
                                      ↓
                                   ไปที่ /mint/{tokenId}
                                      ↓
                                   View NFT Page
```

## 📋 API Routes ที่ใช้

1. **`/api/verify-signin`** - Verify Farcaster Sign In message
2. **`/api/nft-by-fid`** - หา `tokenId` จาก `FID`
3. **`/api/nft-metadata`** - ดึง metadata จาก contract (`tokenURI`)
4. **`/api/nft-check`** - ตรวจสอบว่า NFT มีอยู่จริง และหา owner
5. **`/api/farcaster-user`** - ดึงข้อมูล Farcaster user (username, avatar, etc.)
6. **`/api/nft-list`** - ดึงรายการ NFTs ทั้งหมด (paginated)
7. **`/api/upload-pinata`** - Upload image และ metadata ไป Pinata IPFS (optional)

## 🎨 Art Generation

- **Library:** `lib/p5-art-generator.ts`
- **Seed:** ใช้ `fid || tokenId` (prioritize FID)
- **Size:** 600x600 pixels
- **Format:** PNG (base64) สำหรับ mint, Canvas สำหรับ display

## 🔐 Authentication Flow

1. User คลิก "Sign In with Farcaster"
2. SDK เรียก `sdk.actions.signIn()` → ได้ `message` และ `signature`
3. ส่งไปที่ `/api/verify-signin` เพื่อ verify
4. Backend verify signature และ return `fid` และ `address`
5. Frontend บันทึกใน `localStorage`:
   - `farcaster_signed_in = "true"`
   - `farcaster_fid = "{fid}"`
   - `farcaster_address = "{address}"`
6. Header และ Mint page อ่านจาก `localStorage` เพื่อแสดงสถานะ

## 📝 Smart Contract

- **Contract:** `FarcasterAbtract` (ERC721Upgradeable)
- **Address:** `0xD02C5835EE40eF6d852C823a2651d6A9291935b2` (Base chain)
- **Function:** `mint(address to, uint256 fid, string imageBase64, string externalUrl)`
- **Token ID:** `nextId++` (sequential: 0, 1, 2, 3...)
- **FID:** เก็บใน `tokenURI` metadata (attributes)
- **Event:** `Mint(address indexed to, uint256 indexed tokenId, uint256 fid)`

