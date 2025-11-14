// SPDX-License-Identifier: MIT

pragma solidity ^0.8.30;

import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC721URIStorageUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

contract FarcasterAbtract is
    Initializable,
    ERC721Upgradeable,
    ERC721URIStorageUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable
{
    uint256 public constant MAX_SUPPLY = 12_345;
    uint256 public nextId; // Keep for tracking total supply
    mapping(uint256 => bool) public mintedFid;

    event Mint(address indexed to, uint256 indexed tokenId, uint256 fid);
    event TokenURIUpdated(uint256 indexed tokenId, string newUri);

    function initialize(address _owner) external initializer {
        __ERC721_init("Farcaster Abtract", "FAID");
        __Ownable_init(_owner);
        __ReentrancyGuard_init();
    }

    // anyone can mint if supply available and FID not used
    function mint(address to, uint256 fid, string calldata imageBase64, string calldata externalUrl) external nonReentrant {
        require(!mintedFid[fid], "FID used");
        require(nextId < MAX_SUPPLY, "Mint! Out Thank");

        mintedFid[fid] = true;
        
        // ✅ Use nextId++ for sequential tokenId (0, 1, 2, 3, 4...)
        // FID will be stored in tokenURI metadata
        uint256 tokenId = nextId++;

        string memory imageUri = _imageUri(imageBase64);
        string memory json = _json(tokenId, fid, imageUri, externalUrl);
        string memory tokenUri = string(
            abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json)))
        );

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenUri);

        emit Mint(to, tokenId, fid);
    }

    function _imageUri(string memory raw) internal pure returns (string memory) {
        if (_isIpfs(raw)) return raw;
        if (_isHtml(raw)) return string(abi.encodePacked("data:text/html;base64,", raw));
        if (_isJpeg(raw)) return string(abi.encodePacked("data:image/jpeg;base64,", raw));
        if (_isWebp(raw)) return string(abi.encodePacked("data:image/webp;base64,", raw));
        return string(abi.encodePacked("data:image/png;base64,", raw));
    }

    function _startsWith(string memory s, bytes memory prefix) internal pure returns (bool) {
        bytes memory bs = bytes(s);
        if (bs.length < prefix.length) return false;
        for (uint256 i = 0; i < prefix.length; i++) {
            if (bs[i] != prefix[i]) return false;
        }
        return true;
    }

    function _json(uint256 tokenId, uint256 fid, string memory img, string memory externalUrl) internal pure returns (string memory) {
        // Build external_url field if provided, otherwise omit it
        string memory externalUrlField = "";
        if (bytes(externalUrl).length > 0) {
            externalUrlField = string(abi.encodePacked(',"external_url":"', externalUrl, '"'));
        }
        
        // Match Pinata metadata format:
        // - name: "Base Abstract #${tokenId}"
        // - description: "Generative art NFT for Farcaster FID ${fid}"
        // - attributes: FID and Token ID
        return string(
            abi.encodePacked(
                '{"name":"Base Abstract #', _uint2str(tokenId),
                '", "description":"Generative art NFT for Farcaster FID ', _uint2str(fid),
                '","attributes":[{"trait_type":"FID","value":"', _uint2str(fid), '"},{"trait_type":"Token ID","value":"', _uint2str(tokenId), '"}],',
                '"image":"', img, '"',
                externalUrlField,
                '}'
            )
        );
    }

    function _isIpfs(string memory s) internal pure returns (bool) { return _startsWith(s, bytes("ipfs://")); }
    function _isHtml(string memory s) internal pure returns (bool) { return _startsWith(s, bytes("PCFET")); }
    function _isJpeg(string memory s) internal pure returns (bool) { return _startsWith(s, bytes("/9j/")); }
    function _isWebp(string memory s) internal pure returns (bool) { return _startsWith(s, bytes("UklGR")); }

    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) return "0";
        uint256 j = _i; uint256 len;
        while (j != 0) { len++; j /= 10; }
        bytes memory bstr = new bytes(len);
        uint256 k = len; j = _i;
        while (j != 0) { bstr[--k] = bytes1(uint8(48 + j % 10)); j /= 10; }
        return string(bstr);
    }

    // overrides
    function tokenURI(uint256 id)
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        return super.tokenURI(id);
    }

    function supportsInterface(bytes4 i)
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(i);
    }
}
