const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Get the contract factories
  const Admin = await hre.ethers.getContractFactory("Admin");
  const Characters = await hre.ethers.getContractFactory("Characters");
  const Comics = await hre.ethers.getContractFactory("Comics");
  const Props = await hre.ethers.getContractFactory("Props");
  const Scenes = await hre.ethers.getContractFactory("Scenes");
  
  // Get the contract ABIs
  const adminABI = Admin.interface.formatJson();
  const charactersABI = Characters.interface.formatJson();
  const comicsABI = Comics.interface.formatJson();
  const propsABI = Props.interface.formatJson();
  const scenesABI = Scenes.interface.formatJson();
  
  // Create the output directory if it doesn't exist
  const outputDir = path.join(__dirname, "..", "app", "constants");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Write the ABIs to files
  const contracts = {
    admin: { abi: JSON.parse(adminABI) },
    characters: { abi: JSON.parse(charactersABI) },
    comics: { abi: JSON.parse(comicsABI) },
    props: { abi: JSON.parse(propsABI) },
    scenes: { abi: JSON.parse(scenesABI) }
  };

  const abiPath = path.join(outputDir, "contracts.json");
  fs.writeFileSync(abiPath, JSON.stringify(contracts, null, 2));
  
  console.log("Contract ABIs exported to:", abiPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 