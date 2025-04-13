// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ComicNFT is ERC721URIStorage, Ownable {
    uint256 private _comicIds;
    uint256 private _tokenIds;
    
    uint256 public constant MINT_PRICE = 0.0 ether;
    uint256 public constant MAX_COPIES = 1024;
    uint256 public constant INITIAL_CHARACTER_PRICE = 0.0 ether;
    uint256 public constant PROMPT_PRICE = 0.0 ether;
    
    struct Comic {
        string title;
        string description;
        string coverImage;
        uint256 price;
        bool isPublished;
        address creator;
        uint256 createdAt;
        uint256 copiesMinted;
        string baseUri;
        uint256 characterCount;
        uint256 nextCharacterPrice;
        string artisticStyle;
    }
    
    struct Character {
        string name;
        string description;
        string prompt;
        string imageUrl;
        address creator;
        uint256 timestamp;
    }
    
    mapping(uint256 => Comic) public comics;
    mapping(uint256 => uint256) public tokenToComic;
    mapping(uint256 => Character[]) public characters; // comicId => characters
    mapping(uint256 => mapping(address => bool)) public hasPaidForPrompt;
    mapping(address => uint256[]) public creatorComics;
    
    event ComicCreated(uint256 indexed comicId, address indexed creator, string title);
    event CopyMinted(uint256 indexed comicId, uint256 indexed tokenId, address minter);
    event CharacterCreated(uint256 indexed comicId, uint256 indexed characterId, address creator, string name);
    event PromptPaid(address indexed user, uint256 amount);
    event CharacterAdded(uint256 indexed comicId, string name, string imageUrl);
    event CoverImageUpdated(uint256 indexed comicId, string coverImage);

    constructor() ERC721("ComicNFT", "CNFT") Ownable(msg.sender) {}

    function createComic(string memory title, string memory description, string memory artisticStyle) public returns (uint256) {
        _comicIds++;
        uint256 newComicId = _comicIds;

        comics[newComicId] = Comic({
            title: title,
            description: description,
            coverImage: "",
            price: 0,
            isPublished: false,
            creator: msg.sender,
            createdAt: block.timestamp,
            copiesMinted: 0,
            baseUri: "",
            characterCount: 0,
            nextCharacterPrice: INITIAL_CHARACTER_PRICE,
            artisticStyle: artisticStyle
        });

        creatorComics[msg.sender].push(newComicId);
        _safeMint(msg.sender, newComicId);
        _setTokenURI(newComicId, string(abi.encodePacked("comic-", _toString(newComicId))));

        emit ComicCreated(newComicId, msg.sender, title);
        return newComicId;
    }

    function createCharacter(
        uint256 comicId,
        string memory name,
        string memory description,
        string memory prompt,
        string memory imageUrl
    ) public payable returns (uint256) {
        require(comicId > 0 && comicId <= _comicIds, "Comic doesn't exist");
        
        uint256 characterId = comics[comicId].characterCount;
        
        characters[comicId].push(Character({
            name: name,
            description: description,
            prompt: prompt,
            imageUrl: imageUrl,
            creator: msg.sender,
            timestamp: block.timestamp
        }));
        
        comics[comicId].characterCount++;
        comics[comicId].nextCharacterPrice *= 2;
        
        emit CharacterCreated(comicId, characterId, msg.sender, name);
        emit CharacterAdded(comicId, name, imageUrl);
        
        return characterId;
    }

    function mintCopy(uint256 comicId) public payable {
        require(msg.value >= MINT_PRICE, "Insufficient payment");
        require(comicId > 0 && comicId <= _comicIds, "Comic doesn't exist");
        require(comics[comicId].copiesMinted < MAX_COPIES, "All copies have been minted");
        
        _mintCopy(comicId, msg.sender);
    }

    function _mintCopy(uint256 comicId, address recipient) internal {
        Comic storage comic = comics[comicId];
        require(comic.copiesMinted < MAX_COPIES, "All copies have been minted");
        
        _tokenIds++;
        uint256 newTokenId = _tokenIds;
        
        _safeMint(recipient, newTokenId);
        _setTokenURI(newTokenId, comic.baseUri);
        
        tokenToComic[newTokenId] = comicId;
        comic.copiesMinted++;
        
        emit CopyMinted(comicId, newTokenId, recipient);
    }

    function getComicDetails(uint256 comicId) public view returns (
        string memory title,
        string memory description,
        string memory coverImage,
        uint256 price,
        bool isPublished,
        address creator,
        uint256 createdAt,
        uint256 copiesMinted,
        string memory baseUri,
        uint256 characterCount,
        uint256 nextCharacterPrice,
        string memory artisticStyle
    ) {
        Comic memory comic = comics[comicId];
        return (
            comic.title,
            comic.description,
            comic.coverImage,
            comic.price,
            comic.isPublished,
            comic.creator,
            comic.createdAt,
            comic.copiesMinted,
            comic.baseUri,
            comic.characterCount,
            comic.nextCharacterPrice,
            comic.artisticStyle
        );
    }

    function createCoverImage(
        uint256 comicId,
        string memory imageUrl
    ) public {
        require(comicId > 0 && comicId <= _comicIds, "Comic doesn't exist");
        require(comics[comicId].creator == msg.sender, "Not the comic creator");

        comics[comicId].coverImage = imageUrl;
        emit CoverImageUpdated(comicId, imageUrl);
    }

    function payForPrompt() public payable {
        require(msg.value >= PROMPT_PRICE, "Must send ETH to pay for prompt");
        hasPaidForPrompt[block.number][msg.sender] = true;
        emit PromptPaid(msg.sender, msg.value);
    }

    function getCharacters(uint256 comicId) public view returns (Character[] memory) {
        require(comicId > 0 && comicId <= _comicIds, "Comic doesn't exist");
        return characters[comicId];
    }

    function getCreatorComics(address creator) public view returns (uint256[] memory) {
        return creatorComics[creator];
    }

    function withdraw() public onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
} 