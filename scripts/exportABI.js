const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Get the contract factory
  const ComicNFT = await hre.ethers.getContractFactory("ComicNFT");
  
  // Get the contract ABI
  const abi = ComicNFT.interface.formatJson();
  
  // Create the output directory if it doesn't exist
  const outputDir = path.join(__dirname, "..", "app", "constants");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Write the ABI to a file
  const abiPath = path.join(outputDir, "contract.json");
  fs.writeFileSync(abiPath, JSON.stringify({ abi: JSON.parse(abi) }, null, 2));
  
  console.log("ABI exported to:", abiPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 