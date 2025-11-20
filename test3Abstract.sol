// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC721URIStorageUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

 
contract test3Abstract is
    Initializable,
    ERC721Upgradeable,
    ERC721URIStorageUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable
{
    uint256 public constant MAX_SUPPLY = 12_345;
    uint256 public nextId; // Keep for tracking total supply
    
    mapping(uint256 => bool) public mintedFid;
    mapping(address => bool) public hasMinted; // Track if address has minted
    
    // Store additional metadata for future use
    mapping(uint256 => uint256) public tokenToFid; // tokenId => fid
    mapping(uint256 => address) public fidToMinter; // fid => original minter
    
    event Mint(address indexed to, uint256 indexed tokenId, uint256 fid);
    event TokenURIUpdated(uint256 indexed tokenId, string newUri);

    function initialize(address _owner) external initializer {
        __ERC721_init("test3Abstract", "TXD");
        __Ownable_init(_owner);
        __ReentrancyGuard_init();
    }

    /**
     * @dev Mint function - public minting without signature requirement
     * @param to Address to mint NFT to
     * @param fid Farcaster FID (must be unique)
     * @param imageData IPFS hash (ipfs://Qm...) or base64 image data
     * @param externalUrl External URL for the NFT
     */
    function mint(
        address to, 
        uint256 fid, 
        string calldata imageData, 
        string calldata externalUrl
    ) external nonReentrant {
        require(!hasMinted[msg.sender], "Already minted");
        require(!mintedFid[fid], "FID used");
        require(nextId < MAX_SUPPLY, "Mint! Out Thank");
        
        // ✅ Enhanced validation
        require(fid > 0 && fid < 1000000, "Invalid FID range");
        require(to != address(0), "Invalid recipient address");
        require(bytes(imageData).length > 0, "Image data required");

        mintedFid[fid] = true;
        hasMinted[msg.sender] = true;
        
        uint256 tokenId = nextId++;

        // Store mapping for future queries
        tokenToFid[tokenId] = fid;
        fidToMinter[fid] = msg.sender;

        // Generate and set metadata
        _mintWithMetadata(to, tokenId, fid, imageData, externalUrl);
        
        emit Mint(to, tokenId, fid);
    }

    /**
     * @dev Internal function to mint with metadata generation
     */
    function _mintWithMetadata(address to, uint256 tokenId, uint256 fid, string calldata imageData, string calldata externalUrl) internal {
        string memory imageUri = _imageUri(imageData);
        string memory json = _json(tokenId, fid, imageUri, externalUrl);
        string memory tokenUri = string(
            abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json)))
        );
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenUri);
    }

    /**
     * @dev Smart image URI handler - supports IPFS, base64, and various formats
     */
    function _imageUri(string memory raw) internal pure returns (string memory) {
        // Priority 1: IPFS (future-proof, decentralized)
        if (_isIpfs(raw)) return raw;
        
        // Priority 2: HTTP URLs (for external hosting)
        if (_isHttp(raw)) return raw;
        
        // Priority 3: Base64 data (various formats)
        if (_isHtml(raw)) return string(abi.encodePacked("data:text/html;base64,", raw));
        if (_isJpeg(raw)) return string(abi.encodePacked("data:image/jpeg;base64,", raw));
        if (_isWebp(raw)) return string(abi.encodePacked("data:image/webp;base64,", raw));
        if (_isSvg(raw)) return string(abi.encodePacked("data:image/svg+xml;base64,", raw));
        
        // Default: PNG base64
        return string(abi.encodePacked("data:image/png;base64,", raw));
    }

    /**
     * @dev Enhanced JSON metadata with backup URLs and future-proof attributes
     */
    function _json(uint256 tokenId, uint256 fid, string memory img, string memory externalUrl) internal pure returns (string memory) {
        // Build external_url field
        string memory externalUrlField = "";
        if (bytes(externalUrl).length > 0) {
            externalUrlField = string(abi.encodePacked(',"external_url":"', externalUrl, '"'));
        }
        
        // Enhanced metadata with backup and future-proof attributes
        return string(
            abi.encodePacked(
                '{"name":"test3Abstract #', _uint2str(tokenId),
                '", "description":"Generative art NFT for Farcaster FID ', _uint2str(fid),
                '. Part of the test3Abstract collection - where art meets social identity.',
                '","attributes":[',
                    '{"trait_type":"FID","value":"', _uint2str(fid), '"},',
                    '{"trait_type":"Token ID","value":"', _uint2str(tokenId), '"}',
                '],',
                '"image":"', img, '"',
                externalUrlField,
                '}'
            )
        );
    }

    // Enhanced format detection
    function _isIpfs(string memory s) internal pure returns (bool) { 
        return _startsWith(s, bytes("ipfs://"));
    }
    
    function _isHttp(string memory s) internal pure returns (bool) { 
        return _startsWith(s, bytes("http://")) || _startsWith(s, bytes("https://"));
    }
    
    function _isHtml(string memory s) internal pure returns (bool) { 
        return _startsWith(s, bytes("PCFET")); // <!DOCTYPE in base64
    }
    
    function _isJpeg(string memory s) internal pure returns (bool) { 
        return _startsWith(s, bytes("/9j/")); // JPEG header in base64
    }
    
    function _isWebp(string memory s) internal pure returns (bool) { 
        return _startsWith(s, bytes("UklGR")); // WEBP header in base64
    }
    
    function _isSvg(string memory s) internal pure returns (bool) { 
        return _startsWith(s, bytes("PHN2Zw==")); // <svg in base64
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

    // ========== VIEW FUNCTIONS ==========
    
    /**
     * @dev Get FID by token ID
     */
    function getFidByTokenId(uint256 tokenId) external view returns (uint256) {
        require(_ownerOf(tokenId) != address(0), "Token not exists");
        return tokenToFid[tokenId];
    }
    
    /**
     * @dev Get original minter by FID
     */
    function getMinterByFid(uint256 fid) external view returns (address) {
        return fidToMinter[fid];
    }
    
    /**
     * @dev Check if FID has been used
     */
    function isFidUsed(uint256 fid) external view returns (bool) {
        return mintedFid[fid];
    }
    
    /**
     * @dev Check if address has already minted
     */
    function hasAddressMinted(address addr) external view returns (bool) {
        return hasMinted[addr];
    }
    
    /**
     * @dev Get total supply
     */
    function totalSupply() external view returns (uint256) {
        return nextId;
    }

    // ========== OWNER FUNCTIONS ==========
    
    /**
     * @dev Emergency function to update token URI (owner only)
     */
    function updateTokenURI(uint256 tokenId, string calldata newUri) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token not exists");
        _setTokenURI(tokenId, newUri);
        emit TokenURIUpdated(tokenId, newUri);
    }
    
    /**
     * @dev Reset hasMinted status for an address (owner only, emergency use)
     */
    function resetMintStatus(address addr) external onlyOwner {
        hasMinted[addr] = false;
    }

    // ========== OVERRIDES ==========
    
    /**
     * @dev Override name() to return default value if not initialized
     */
    function name() public view override returns (string memory) {
        string memory _name = super.name();
        if (bytes(_name).length == 0) {
            return "test3Abstract";
        }
        return _name;
    }

    /**
     * @dev Override symbol() to return default value if not initialized
     */
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

