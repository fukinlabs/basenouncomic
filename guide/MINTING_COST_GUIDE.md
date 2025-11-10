# Minting Cost Guide - 0.0001 ETH

## Smart Contract Changes

### 1. เพิ่ม Mint Price Variable

```solidity
uint256 public mintPrice = 0.0001 ether; // Minting cost: 0.0001 ETH
```

### 2. เปลี่ยน Function เป็น Payable

```solidity
function mintForFid(
    address to, 
    uint256 fid, 
    string memory metadataIpfsHash
) external payable {  // ✅ เพิ่ม payable
    require(msg.value >= mintPrice, "Insufficient payment: 0.0001 ETH required");
    // ...
}
```

### 3. คืนเงินส่วนเกิน (ถ้าจ่ายเกิน)

```solidity
// ถ้าจ่ายเกินราคา ให้คืนเงินส่วนเกิน
if (msg.value > mintPrice) {
    payable(msg.sender).transfer(msg.value - mintPrice);
}
```

### 4. Owner Functions

```solidity
// Owner สามารถเปลี่ยน mint price ได้
function setMintPrice(uint256 newPrice) external onlyOwner {
    mintPrice = newPrice;
}

// Owner สามารถ withdraw ETH ที่สะสมไว้ได้
function withdraw() external onlyOwner {
    uint256 balance = address(this).balance;
    require(balance > 0, "No funds to withdraw");
    payable(owner()).transfer(balance);
}
```

## Frontend Changes

### 1. เพิ่ม Value ใน writeContract

```typescript
// app/mint/page.tsx
const mintCost = BigInt("100000000000000"); // 0.0001 ETH in wei

writeContract({
  address: NFT_CONTRACT_ADDRESS,
  abi: contractABI,
  functionName: "mintForFid",
  args: [address, BigInt(fid), imageData],
  value: mintCost, // ✅ ส่ง ETH ไปด้วย
});
```

### 2. แสดง Minting Cost ใน UI

```typescript
// แสดงราคาใน UI
<p className="text-sm text-gray-600">
  Minting cost: 0.0001 ETH
</p>
```

## การคำนวณ Wei

- 1 ETH = 1,000,000,000,000,000,000 wei (10^18)
- 0.0001 ETH = 100,000,000,000,000 wei (10^14)

```typescript
// วิธีที่ 1: ใช้ BigInt string
const mintCost = BigInt("100000000000000");

// วิธีที่ 2: ใช้ parseEther จาก viem
import { parseEther } from "viem";
const mintCost = parseEther("0.0001");
```

## ตัวอย่างการใช้งาน

### Frontend (Wagmi)

```typescript
import { parseEther } from "viem";

const handleMint = async () => {
  // ...
  
  const mintCost = parseEther("0.0001"); // 0.0001 ETH
  
  writeContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: contractABI,
    functionName: "mintForFid",
    args: [address, BigInt(fid), imageData],
    value: mintCost,
  });
};
```

### ตรวจสอบ Balance ก่อน Mint

```typescript
const { data: balance } = useBalance({
  address: address,
});

const canMint = balance && balance.value >= parseEther("0.0001");

// แสดง warning ถ้า balance ไม่พอ
{!canMint && (
  <p className="text-red-600">
    Insufficient balance. You need at least 0.0001 ETH to mint.
  </p>
)}
```

## Error Handling

### Insufficient Payment

```solidity
require(msg.value >= mintPrice, "Insufficient payment: 0.0001 ETH required");
```

Frontend จะได้รับ error ถ้าจ่ายไม่พอ

### Refund Excess Payment

```solidity
if (msg.value > mintPrice) {
    payable(msg.sender).transfer(msg.value - mintPrice);
}
```

Contract จะคืนเงินส่วนเกินอัตโนมัติ

## Owner Functions

### เปลี่ยน Mint Price

```solidity
// Owner only
function setMintPrice(uint256 newPrice) external onlyOwner {
    mintPrice = newPrice;
}
```

**ตัวอย่าง:**
```javascript
// เปลี่ยนเป็น 0.0002 ETH
await contract.setMintPrice(parseEther("0.0002"));
```

### Withdraw Funds

```solidity
// Owner only
function withdraw() external onlyOwner {
    uint256 balance = address(this).balance;
    require(balance > 0, "No funds to withdraw");
    payable(owner()).transfer(balance);
}
```

**ตัวอย่าง:**
```javascript
// Owner withdraw ETH ทั้งหมด
await contract.withdraw();
```

## สรุป

### Smart Contract
- ✅ เพิ่ม `mintPrice = 0.0001 ether`
- ✅ เปลี่ยน `mintForFid` เป็น `payable`
- ✅ ตรวจสอบ `msg.value >= mintPrice`
- ✅ คืนเงินส่วนเกินอัตโนมัติ
- ✅ Owner functions: `setMintPrice()`, `withdraw()`

### Frontend
- ✅ ส่ง `value: parseEther("0.0001")` ใน `writeContract`
- ✅ แสดง minting cost ใน UI
- ✅ ตรวจสอบ balance ก่อน mint

## ราคาในหน่วยต่างๆ

| Unit | Value |
|------|-------|
| ETH | 0.0001 |
| Wei | 100,000,000,000,000 |
| Gwei | 100,000,000 |

## หมายเหตุ

- Contract จะเก็บ ETH ที่ได้รับไว้ใน contract address
- Owner ต้องเรียก `withdraw()` เพื่อถอน ETH ออก
- ถ้าจ่ายเกินราคา Contract จะคืนเงินส่วนเกินอัตโนมัติ
- Frontend ควรแสดงราคาและตรวจสอบ balance ก่อน mint

