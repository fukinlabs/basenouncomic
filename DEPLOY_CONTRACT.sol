// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {ERC721URIStorageUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract BasegenerateOnchainNFT is Initializable, ERC721URIStorageUpgradeable, OwnableUpgradeable {
    mapping(uint256 => bool) public mintedFid;
    uint256 public nextId;

    event MintForFID(address indexed to, uint256 indexed tokenId, uint256 fid);

    function initialize(address initialOwner) public initializer {
        __ERC721_init("FarcasterP5NFT", "FP5");
        __Ownable_init(initialOwner);
    }

    function mintForFid(
        address to, 
        uint256 fid,
        string memory imageBase64
    ) external {
        require(!mintedFid[fid], "This FID already minted");
        require(to != address(0), "Invalid address");
        
        mintedFid[fid] = true;
        uint256 tokenId = nextId++;

        bool isIpfsHash = _isIpfsHash(imageBase64);
        bool isHtmlBase64 = _isHtmlBase64(imageBase64);
        bool isJpegBase64 = _isJpegBase64(imageBase64);
        
        string memory imageDataUri;
        if (isIpfsHash) {
            imageDataUri = imageBase64;
        } else if (isHtmlBase64) {
            imageDataUri = string(abi.encodePacked("data:image/png;base64,", imageBase64));
        } else if (isJpegBase64) {
            imageDataUri = string(abi.encodePacked("data:image/jpeg;base64,", imageBase64));
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
}

