require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const ComicNFT = await hre.ethers.getContractFactory("ComicNFT");
  const comicNFT = await ComicNFT.deploy();

  await comicNFT.waitForDeployment();

  console.log("ComicNFT deployed to:", await comicNFT.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
