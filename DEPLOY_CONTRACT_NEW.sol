// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {ERC721URIStorageUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract BasegenonetestOnchainNFT is Initializable, ERC721URIStorageUpgradeable, OwnableUpgradeable {
    mapping(uint256 => bool) public mintedFid;
    uint256 public nextId;
    uint256 public constant MAX_SUPPLY = 12345; // Maximum supply limit

    event MintForFID(address indexed to, uint256 indexed tokenId, uint256 fid);

    function initialize(address initialOwner) public initializer {
        __ERC721_init("BasttestNFT", "BT5");
        __Ownable_init(initialOwner);
    }

    function mintForFid(
        address to, 
        uint256 fid,
        string memory imageBase64
    ) external {
        require(!mintedFid[fid], "This FID already minted");
        require(to != address(0), "Invalid address");
        require(nextId < MAX_SUPPLY, "Maximum supply reached");
        
        mintedFid[fid] = true;
        uint256 tokenId = nextId++;
        require(tokenId < MAX_SUPPLY, "Maximum supply exceeded");

        bool isIpfsHash = _isIpfsHash(imageBase64);
        bool isHtmlBase64 = _isHtmlBase64(imageBase64);
        bool isJpegBase64 = _isJpegBase64(imageBase64);
        bool isWebpBase64 = _isWebpBase64(imageBase64);
        
        string memory imageDataUri;
        if (isIpfsHash) {
            imageDataUri = imageBase64;
        } else if (isHtmlBase64) {
            // ✅ แก้ไข: เก็บ HTML base64 อย่างถูกต้อง
            imageDataUri = string(abi.encodePacked("data:text/html;base64,", imageBase64));
        } else if (isJpegBase64) {
            imageDataUri = string(abi.encodePacked("data:image/jpeg;base64,", imageBase64));
        } else if (isWebpBase64) {
            imageDataUri = string(abi.encodePacked("data:image/webp;base64,", imageBase64));
        } else {
            imageDataUri = string(abi.encodePacked("data:image/png;base64,", imageBase64));
        }

        string memory json = string(
            abi.encodePacked(
                '{"name":"BaseP5 #', _uint2str(fid),
                '", "description":"p5.js generated NFT bound to Farcaster FID ', _uint2str(fid),
                '","attributes":[{"trait_type":"FID","value":"', _uint2str(fid), '"}],',
                '"image":"', imageDataUri, '"}'
            )
        );

        string memory tokenUri = string(
            abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json)))
        );

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenUri);

        emit MintForFID(to, tokenId, fid);
    }

    function _isIpfsHash(string memory dataString) internal pure returns (bool) {
        bytes memory dataBytes = bytes(dataString);
        bytes memory ipfsPrefix = bytes("ipfs://");
        
        if (dataBytes.length < ipfsPrefix.length) {
            return false;
        }
        
        for (uint i = 0; i < ipfsPrefix.length; i++) {
            if (dataBytes[i] != ipfsPrefix[i]) {
                return false;
            }
        }
        
        return true;
    }

    function _isJpegBase64(string memory base64String) internal pure returns (bool) {
        bytes memory base64Bytes = bytes(base64String);
        
        if (base64Bytes.length >= 4) {
            if (
                base64Bytes[0] == 0x2F &&
                base64Bytes[1] == 0x39 &&
                base64Bytes[2] == 0x6A &&
                base64Bytes[3] == 0x2F
            ) {
                return true;
            }
        }
        
        return false;
    }

    function _isHtmlBase64(string memory base64String) internal pure returns (bool) {
        bytes memory base64Bytes = bytes(base64String);
        
        if (base64Bytes.length >= 7) {
            if (
                base64Bytes[0] == 0x50 &&
                base64Bytes[1] == 0x48 &&
                base64Bytes[2] == 0x52 &&
                base64Bytes[3] == 0x74 &&
                base64Bytes[4] == 0x62 &&
                base64Bytes[5] == 0x57 &&
                base64Bytes[6] == 0x77
            ) {
                return true;
            }
        }
        
        if (base64Bytes.length >= 20) {
            bytes memory doctypePrefix = bytes("PCFET0NUWVBFIGh0bWw");
            bool found = true;
            for (uint i = 0; i < doctypePrefix.length; i++) {
                if (i >= base64Bytes.length || base64Bytes[i] != doctypePrefix[i]) {
                    found = false;
                    break;
                }
            }
            if (found) {
                return true;
            }
        }
        
        bytes memory htmlMarker = bytes("data:text/html");
        if (base64Bytes.length >= htmlMarker.length) {
            bool found = true;
            for (uint i = 0; i < htmlMarker.length; i++) {
                if (i >= base64Bytes.length || base64Bytes[i] != htmlMarker[i]) {
                    found = false;
                    break;
                }
            }
            if (found) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Check if base64 string is WebP
     * WebP base64 typically starts with "UklGR" (RIFF header in base64)
     * WebP magic bytes: RIFF (0x52 0x49 0x46 0x46) followed by WEBP (0x57 0x45 0x42 0x50)
     * Base64 encoding of "RIFF" = "UklGRg=="
     * Base64 encoding of "RIFF....WEBP" starts with "UklGR"
     */
    function _isWebpBase64(string memory base64String) internal pure returns (bool) {
        bytes memory base64Bytes = bytes(base64String);
        
        // WebP base64 typically starts with "UklGR" (RIFF header)
        if (base64Bytes.length >= 5) {
            // Check for "UklGR" (0x55 0x6B 0x6C 0x47 0x52)
            if (
                base64Bytes[0] == 0x55 && // 'U'
                base64Bytes[1] == 0x6B && // 'k'
                base64Bytes[2] == 0x6C && // 'l'
                base64Bytes[3] == 0x47 && // 'G'
                base64Bytes[4] == 0x52    // 'R'
            ) {
                // Additional check: Look for "WEBP" in the base64 string
                // "WEBP" in base64 = "V0VCUA=="
                // We check for "V0VC" (0x56 0x30 0x55 0x42) which appears after RIFF
                if (base64Bytes.length >= 12) {
                    // Check around position 8-12 for "V0VC" (WEBP in base64)
                    for (uint i = 8; i < base64Bytes.length - 4; i++) {
                        if (
                            base64Bytes[i] == 0x56 &&     // 'V'
                            base64Bytes[i + 1] == 0x30 && // '0'
                            base64Bytes[i + 2] == 0x55 && // 'U'
                            base64Bytes[i + 3] == 0x42    // 'B'
                        ) {
                            return true;
                        }
                    }
                }
                // If we found "UklGR" but couldn't find "WEBP", still likely WebP
                return true;
            }
        }
        
        return false;
    }

    function _uint2str(uint _i) internal pure returns (string memory _uintAsString) {
        if (_i == 0) {
            return "0";
        }
        uint j = _i;
        uint len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint k = len;
        j = _i;
        while (j != 0) {
            bstr[--k] = bytes1(uint8(48 + j % 10));
            j /= 10;
        }
        return string(bstr);
    }

    /**
     * Get current supply
     */
    function totalSupply() public view returns (uint256) {
        return nextId;
    }

    /**
     * Get remaining supply
     */
    function remainingSupply() public view returns (uint256) {
        return MAX_SUPPLY - nextId;
    }
}

