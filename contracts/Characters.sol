// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract Characters is ERC721URIStorage, Ownable {
    uint256 private _tokenIds;
    uint256 private _activeCharacters;

    uint256 BASE_CHARACTER_PRICE = 0;

    struct Character {
        string name;
        string image;
        uint256 createdAt;
    }

    mapping(uint256 => Character) public characters;
    mapping(string => uint256) public nameToTokenId;
    string public baseURI;
    mapping(uint256 => bool) public isAlive;

    event CharacterMinted(uint256 indexed tokenId, string name, string image, uint256 price);
    event CharacterKilled(uint256 indexed tokenId, string name);
    event BasePriceUpdated(uint256 newPrice);

    constructor() ERC721("World Comics Characters", "WCC") Ownable(msg.sender) {
        baseURI = "data:application/json;base64,";
    }

    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    function checkIsAlive(uint256 tokenId) public view returns (bool) {
        return _exists(tokenId) && ownerOf(tokenId) != address(0);
    }

    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address){
        if (to == address(0)) {
            // Get character data before deletion
            Character memory character = characters[tokenId];
            
            // Delete character data
            delete characters[tokenId];
            delete nameToTokenId[character.name];
            
            // Decrease active character count
            _activeCharacters--;
            
            emit CharacterKilled(tokenId, character.name);
        }
        
        return super._update(to, tokenId, auth);
    }

    function getMintPrice() public view returns (uint256) {
        uint256 activeCount = _activeCharacters;
        uint256 result = BASE_CHARACTER_PRICE;
        
        for (uint256 i = 0; i < activeCount; i++) {
            result = (result * BASE_CHARACTER_PRICE) / 1e18;
        }
        
        return result;
    }

    function updateBasePrice(uint256 _newPrice) external onlyOwner {
        BASE_CHARACTER_PRICE = _newPrice;
        emit BasePriceUpdated(_newPrice);
    }

    function mintCharacter(string memory name, string memory image) external payable returns (uint256) {
        uint256 existingTokenId = nameToTokenId[name];
        require(existingTokenId == 0, string(abi.encodePacked("Character name already exists with token ID: ", Strings.toString(existingTokenId))));
        
        uint256 price = getMintPrice();
        require(msg.value >= price, "Insufficient payment");
        
        _tokenIds++;
        uint256 newTokenId = _tokenIds;
        _activeCharacters++;

        // Store character data
        characters[newTokenId] = Character({
            name: name,
            image: image,
            createdAt: block.timestamp
        });

        // Store name to token ID mapping
        nameToTokenId[name] = newTokenId;

        // Create metadata JSON
        string memory metadata = string(abi.encodePacked(
            '{"name":"', name, '",',
            '"description":"A character from World Comics",',
            '"image":"', image, '",',
            '"attributes":[',
            '{"trait_type":"Created At","value":"', Strings.toString(block.timestamp), '"}',
            ']}'
        ));

        // Encode metadata to base64
        string memory encodedMetadata = Base64.encode(bytes(metadata));

        // Set token URI with base64 encoded metadata
        _setTokenURI(newTokenId, encodedMetadata);

        // Mint the token
        _mint(msg.sender, newTokenId);

        emit CharacterMinted(newTokenId, name, image, price);
        return newTokenId;
    }

    function killCharacter(uint256 tokenId) external onlyOwner {
        require(_exists(tokenId), "Character does not exist");
        
        // Transfer to zero address will trigger _update and handle the kill
        _update(address(0), tokenId, ownerOf(tokenId));
    }

    function getCharacter(uint256 tokenId) external view returns (Character memory) {
        require(_exists(tokenId), "Character does not exist");
        return characters[tokenId];
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "ERC721URIStorage: URI query for nonexistent token");
        return string(abi.encodePacked(baseURI, super.tokenURI(tokenId)));
    }

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
