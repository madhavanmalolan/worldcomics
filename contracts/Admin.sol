// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

interface ICharacters {
    function isAlive(uint256 tokenId) external view returns (bool);
}

interface IComics {
    function createComic(string memory name, string memory image) external payable returns (uint256);
    function transferOwnership(address newOwner) external;
}

interface IProps {
    function isAlive(uint256 tokenId) external view returns (bool);
}

contract Admin is Ownable {
    // Base fees
    uint256 public PROMPT_PRICE = 0.0 ether;

    mapping(uint256 => mapping(address => bool)) hasPaidForPrompt;
    mapping(uint256 => address) public comicAddresses; // comicId => comics contract address

    // Contract addresses
    address public immutable charactersAddress;
    address public immutable propsAddress;
    address public immutable comicsAddress;

    event PromptPaid(address indexed user, uint256 amount);
    event ComicCreated(uint256 indexed comicId, address comicsAddress, string name);
    event ContractsDeployed(address characters, address props, address comics);

    constructor(
        address _charactersAddress,
        address _propsAddress,
        address _comicsAddress
    ) Ownable(msg.sender) {
        charactersAddress = _charactersAddress;
        propsAddress = _propsAddress;
        comicsAddress = _comicsAddress;

        emit ContractsDeployed(_charactersAddress, _propsAddress, _comicsAddress);
    }

    function getCharactersAddress() external view returns (address) {
        return charactersAddress;
    }

    function getPropsAddress() external view returns (address) {
        return propsAddress;
    }

    function getComicsAddress() external view returns (address) {
        return comicsAddress;
    }

    function withdraw() public onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function payForPrompt() public payable {
        require(msg.value >= PROMPT_PRICE, "Must send ETH to pay for prompt");
        hasPaidForPrompt[block.number][msg.sender] = true;
        emit PromptPaid(msg.sender, msg.value);
    }

    function createComic(string memory _name, string memory _image) external payable returns (uint256) {
        // Get the Comics contract
        IComics comics = IComics(comicsAddress);
        
        // Create comic NFT
        uint256 comicId = comics.createComic{value: msg.value}(_name, _image);
        
        // Store the comics contract address
        comicAddresses[comicId] = comicsAddress;
        
        emit ComicCreated(comicId, comicsAddress, _name);
        
        return comicId;
    }

    function getComicAddress(uint256 _comicId) external view returns (address) {
        return comicAddresses[_comicId];
    }

    function updatePromptPrice(uint256 _promptPrice) onlyOwner external {
        PROMPT_PRICE = _promptPrice;
    }
}