// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "./Characters.sol";

contract Comics is ERC721URIStorage, Ownable {
    uint256 private _tokenIds;

    Characters public characters;
    uint256 public BASE_COMIC_FEE = 0.0;
    uint256 public BASE_STRIP_FEE = 0.0;
    uint256 public comicCount;

    struct Comic {
        string name;
        string image;
        uint256 createdAt;
    }

    struct Strip {
        string[] imageUrls;
        uint256[] characterIds;
        uint256 voteCount;
        address creator;
        uint256 createdAt;
        uint256 comicId;
        uint256 day;
    }

    mapping(uint256 => uint256[]) public dailyStrips;
    mapping(uint256 => uint256) public currentStripDay;
    
    // Mapping of strip ID to strip data
    mapping(uint256 => Strip) public strips;
    
    // Mapping of comic ID to comic data
    mapping(uint256 => Comic) public comics;
    
    // Mapping of comic ID to array of strip IDs
    mapping(uint256 => uint256[]) public comicStrips;
    
    // Mapping of comic ID to address with highest contribution
    mapping(uint256 => address) public comicOwners;
    
    // Mapping of comic ID to address to contribution amount
    mapping(uint256 => mapping(address => uint256)) public contributions;
    
    // Counter for strip IDs
    uint256 private _stripIds;
    
    // Counter for comic IDs
    uint256 private _comicIds;

    mapping(uint256 => string) private _tokenURIs;
    mapping(uint256 => bool) public isAlive;

    event ComicCreated(uint256 indexed comicId, string name, string image);
    event StripCreated(uint256 indexed stripId, uint256 day, address creator, uint256 comicId);
    event StripVoted(uint256 indexed stripId, uint256 amount);
    event StripDonated(uint256 indexed stripId, uint256 amount);
    event ComicOwnershipChanged(uint256 indexed comicId, address newOwner);
    event BaseFeeUpdated(uint256 comicFee, uint256 stripFee);
    event StripFrozen(uint256 comicId, uint256 stripId, uint256 updatedDay);

    constructor(address _characters) ERC721("World Comics", "WC") Ownable(msg.sender) {
        characters = Characters(_characters);
    }

    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    function updateBaseFee(uint256 _comicFee, uint256 _stripFee) external onlyOwner {
        BASE_COMIC_FEE = _comicFee;
        BASE_STRIP_FEE = _stripFee;
        emit BaseFeeUpdated(_comicFee, _stripFee);
    }

    function getComicCreationFee() public view returns (uint256) {
        // Calculate 1.1 ^ comicCount
        // Using fixed-point arithmetic with 18 decimal places
        uint256 base = 11 * 1e17; // 1.1 with 18 decimal places
        uint256 result = BASE_COMIC_FEE;
        
        for (uint256 i = 0; i < comicCount; i++) {
            result = (result * base) / 1e18;
        }
        
        return result;
    }

    function createComic(string memory name, string memory image) external payable returns (uint256) {
        require(msg.value >= getComicCreationFee(), "Insufficient payment for comic creation");
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(image).length > 0, "Image cannot be empty");

        _comicIds++;
        uint256 newComicId = _comicIds;
        comicCount++;

        comics[newComicId] = Comic({
            name: name,
            image: image,
            createdAt: block.timestamp
        });

        // Create metadata JSON
        string memory metadata = string(abi.encodePacked(
            '{"name":"', name, '",',
            '"description":"A comic from World Comics",',
            '"image":"', image, '",',
            '"attributes":[',
            '{"trait_type":"Created At","value":"', Strings.toString(block.timestamp), '"}',
            ']}'
        ));

        // Encode metadata to base64
        string memory encodedMetadata = Base64.encode(bytes(metadata));

        // Mint the comic NFT to the contract
        _mint(address(this), newComicId);
        _setTokenURI(newComicId, encodedMetadata);

        emit ComicCreated(newComicId, name, image);
        return newComicId;
    }

    function createStrip(string[] memory imageUrls, uint256[] memory characterIds, uint256 comicId) external {
        require(imageUrls.length > 0, "Must provide at least one image");
        require(comics[comicId].createdAt > 0, "Comic does not exist");

        // Check if all characters are alive
        for (uint256 i = 0; i < characterIds.length; i++) {
            require(characters.checkIsAlive(characterIds[i]), "All characters must be alive");
        }

        uint256 currentDay = currentStripDay[comicId];

        // Create new strip
        _stripIds++;
        uint256 newStripId = _stripIds;

        strips[newStripId] = Strip({
            imageUrls: imageUrls,
            characterIds: characterIds,
            voteCount: 0,
            creator: msg.sender,
            createdAt: block.timestamp,
            comicId: comicId,
            day: currentDay
        });

        // Add to daily strips and comic strips
        dailyStrips[currentDay].push(newStripId);
        comicStrips[comicId].push(newStripId);

        emit StripCreated(newStripId, currentDay, msg.sender, comicId);
    }

    function getDailyStrips(uint256 day) external view returns (uint256[] memory) {
        return dailyStrips[day];
    }

    function getComicStrips(uint256 comicId) external view returns (uint256[] memory) {
        return comicStrips[comicId];
    }

    function getStrip(uint256 stripId) external view returns (Strip memory) {
        return strips[stripId];
    }

    function getComic(uint256 comicId) external view returns (Comic memory) {
        return comics[comicId];
    }

    function vote(uint256 stripId) external payable {
        require(strips[stripId].createdAt > 0, "Strip does not exist");
        
        uint256 comicId = strips[stripId].comicId;
        uint256 stripDay = strips[comicId].day;
        uint256 currentDay = currentStripDay[comicId];
        
        if(stripDay == currentDay) {
            strips[stripId].voteCount += msg.value;
            emit StripVoted(stripId, msg.value);
        } else {
            emit StripDonated(stripId, msg.value);
        }

        uint256 voteThreshold = BASE_STRIP_FEE * 1e18 ;
        for(uint256 i = 0; i < currentDay; i++){
            voteThreshold *= BASE_STRIP_FEE / 1e18;
        }
        if(strips[stripId].voteCount >= voteThreshold) {
            currentStripDay[comicId] ++;
            emit StripFrozen(comicId, stripId, currentStripDay[comicId]);
        }

        // Update contribution
        contributions[comicId][msg.sender] += msg.value;
        
        // Check if this contribution makes the sender the new owner
        if (contributions[comicId][msg.sender] > contributions[comicId][comicOwners[comicId]]) {
            _transfer(comicOwners[comicId], msg.sender, comicId);
            comicOwners[comicId] = msg.sender;
            emit ComicOwnershipChanged(comicId, msg.sender);
        }
    }

    function getVoteCount(uint256 stripId) external view returns (uint256) {
        require(strips[stripId].createdAt > 0, "Strip does not exist");
        return strips[stripId].voteCount;
    }

    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        require(to != address(0), "Comic transfers are disabled");
        return super._update(to, tokenId, auth);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        return super.tokenURI(tokenId);
    }

    function withdraw() public onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function getCurrentDay(uint256 comicId) public view returns (uint256) {
        return currentStripDay[comicId];
    }

}
