// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC721URIStorageUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

contract test5Abstract is
    Initializable,
    ERC721Upgradeable,
    ERC721URIStorageUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable
{
    uint256 public constant MAX_SUPPLY = 12_345;
    uint256 public nextId;
    
    mapping(uint256 => bool) public mintedFid;
    mapping(address => bool) public hasMinted;
    mapping(uint256 => uint256) public tokenToFid;
    mapping(uint256 => address) public fidToMinter;
    
    event Mint(address indexed to, uint256 indexed tokenId, uint256 fid);
    event TokenURIUpdated(uint256 indexed tokenId, string newUri);

    function initialize(address _owner) external initializer {
        __ERC721_init("test5Abstract", "TXD");
        __Ownable_init(_owner);
        __ReentrancyGuard_init();
    }

    function mint(
        address to, 
        uint256 fid, 
        string calldata imageData, 
        string calldata externalUrl
    ) external nonReentrant {
        require(!hasMinted[msg.sender], "Already minted");
        require(!mintedFid[fid], "FID used");
        require(nextId < MAX_SUPPLY, "Mint! Out Thank");
        require(fid > 0 && fid < 1000000, "Invalid FID range");
        require(to != address(0), "Invalid recipient address");
        require(bytes(imageData).length > 0, "Image data required");

        mintedFid[fid] = true;
        hasMinted[msg.sender] = true;
        uint256 tokenId = nextId++;
        tokenToFid[tokenId] = fid;
        fidToMinter[fid] = msg.sender;

        _mintWithMetadata(to, tokenId, fid, imageData, externalUrl);
        emit Mint(to, tokenId, fid);
    }

    function _mintWithMetadata(address to, uint256 tokenId, uint256 fid, string calldata imageData, string calldata externalUrl) internal {
        string memory imageUri = _imageUri(imageData);
        string memory json = _json(tokenId, fid, imageUri, externalUrl);
        string memory tokenUri = string(
            abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json)))
        );
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenUri);
    }

    function _imageUri(string memory raw) internal pure returns (string memory) {
        if (_startsWith(raw, bytes("ipfs://"))) return raw;
        if (_startsWith(raw, bytes("http://")) || _startsWith(raw, bytes("https://"))) return raw;
        return string(abi.encodePacked("data:image/png;base64,", raw));
    }

    function _json(uint256 tokenId, uint256 fid, string memory img, string memory externalUrl) internal pure returns (string memory) {
        string memory externalUrlField = "";
        if (bytes(externalUrl).length > 0) {
            externalUrlField = string(abi.encodePacked(',"external_url":"', externalUrl, '"'));
        }
        return string(
            abi.encodePacked(
                '{"name":"test5Abstract #', _uint2str(tokenId),
                '","attributes":[{"trait_type":"FID","value":"', _uint2str(fid), '"}],',
                '"image":"', img, '"',
                externalUrlField,
                '}'
            )
        );
    }

    function _startsWith(string memory s, bytes memory prefix) internal pure returns (bool) {
        bytes memory bs = bytes(s);
        if (bs.length < prefix.length) return false;
        for (uint256 i = 0; i < prefix.length; i++) {
            if (bs[i] != prefix[i]) return false;
        }
        return true;
    }

    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) return "0";
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        j = _i;
        while (j != 0) {
            bstr[--k] = bytes1(uint8(48 + j % 10));
            j /= 10;
        }
        return string(bstr);
    }

    function getFidByTokenId(uint256 tokenId) external view returns (uint256) {
        require(_ownerOf(tokenId) != address(0), "Token not exists");
        return tokenToFid[tokenId];
    }

    function getMinterByFid(uint256 fid) external view returns (address) {
        return fidToMinter[fid];
    }

    function isFidUsed(uint256 fid) external view returns (bool) {
        return mintedFid[fid];
    }

    function hasAddressMinted(address addr) external view returns (bool) {
        return hasMinted[addr];
    }

    function totalSupply() external view returns (uint256) {
        return nextId;
    }

    function updateTokenURI(uint256 tokenId, string calldata newUri) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token not exists");
        _setTokenURI(tokenId, newUri);
        emit TokenURIUpdated(tokenId, newUri);
    }

    function resetMintStatus(address addr) external onlyOwner {
        hasMinted[addr] = false;
    }

    function name() public view override returns (string memory) {
        string memory _name = super.name();
        if (bytes(_name).length == 0) {
            return "test5Abstract";
        }
        return _name;
    }

    function symbol() public view override returns (string memory) {
        string memory _symbol = super.symbol();
        if (bytes(_symbol).length == 0) {
            return "TXD";
        }
        return _symbol;
    }
    
    function tokenURI(uint256 id)
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        return super.tokenURI(id);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
