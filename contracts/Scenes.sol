// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

contract Scenes is ERC721URIStorage, Ownable {
    uint256 private _tokenIds;
    uint256 private _activeScenes;
    uint256 public SCENE_FEE = 0.0;

    struct Scene {
        string name;
        string image;
        string artisticStyle;
        uint256 createdAt;
    }

    mapping(uint256 => Scene) public scenes;
    mapping(string => uint256) public nameToTokenId;
    string public baseURI;
    mapping(uint256 => bool) public isAlive;

    event SceneMinted(uint256 indexed tokenId, string name, string image, string artisticStyle);
    event SceneKilled(uint256 indexed tokenId, string name);
    event BaseFeeUpdated(uint256 newFee);

    constructor() ERC721("World Comics Scenes", "WCS") Ownable(msg.sender) {
        baseURI = "data:application/json;base64,";
    }

    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    function checkIsAlive(uint256 tokenId) public view returns (bool) {
        return _exists(tokenId) && ownerOf(tokenId) != address(0);
    }

    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        if (to == address(0)) {
            // Get scene data before deletion
            Scene memory scene = scenes[tokenId];
            
            // Delete scene data
            delete scenes[tokenId];
            delete nameToTokenId[scene.name];
            
            // Decrease active scene count
            _activeScenes--;
            
            emit SceneKilled(tokenId, scene.name);
        }
        
        super._update(to, tokenId, auth);
    }

    function updateBaseFee(uint256 _newFee) external onlyOwner {
        SCENE_FEE = _newFee;
        emit BaseFeeUpdated(_newFee);
    }

    function mintScene(string memory name, string memory image, string memory artisticStyle) external payable returns (uint256) {
        require(msg.value >= SCENE_FEE, "Insufficient payment");
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(image).length > 0, "Image cannot be empty");
        require(bytes(artisticStyle).length > 0, "Artistic style cannot be empty");

        _tokenIds++;
        uint256 newTokenId = _tokenIds;
        _activeScenes++;

        // Store scene data
        scenes[newTokenId] = Scene({
            name: name,
            image: image,
            artisticStyle: artisticStyle,
            createdAt: block.timestamp
        });

        // Store name to token ID mapping
        nameToTokenId[name] = newTokenId;

        // Create metadata JSON
        string memory metadata = string(abi.encodePacked(
            '{"name":"', name, '",',
            '"description":"A scene from World Comics",',
            '"image":"', image, '",',
            '"attributes":[',
            '{"trait_type":"Artistic Style","value":"', artisticStyle, '"},',
            '{"trait_type":"Created At","value":"', Strings.toString(block.timestamp), '"}',
            ']}'
        ));

        // Encode metadata to base64
        string memory encodedMetadata = Base64.encode(bytes(metadata));

        // Set token URI with base64 encoded metadata
        _setTokenURI(newTokenId, encodedMetadata);

        // Mint the token
        _mint(msg.sender, newTokenId);

        isAlive[newTokenId] = true;

        emit SceneMinted(newTokenId, name, image, artisticStyle);
        return newTokenId;
    }

    function getMintPrice() public view returns(uint256) {
        return SCENE_FEE;
    }

    function killScene(uint256 tokenId) external onlyOwner {
        require(_exists(tokenId), "Scene does not exist");
        
        // Transfer to zero address will trigger _update and handle the kill
        _update(address(0), tokenId, ownerOf(tokenId));
    }

    function getScene(uint256 tokenId) external view returns (Scene memory) {
        require(_exists(tokenId), "Scene does not exist");
        return scenes[tokenId];
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "ERC721URIStorage: URI query for nonexistent token");
        return string(abi.encodePacked(baseURI, super.tokenURI(tokenId)));
    }

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
} 