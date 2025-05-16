require("dotenv").config();
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const PROMPT_PRICE = "0.0";
  const BASE_CHARACTER_PRICE = "0.0";
  const BASE_PROP_FEE = "0.0";
  const BASE_SCENE_FEE = "0.0";
  const BASE_COMIC_FEE = "0.0";
  const BASE_STRIP_FEE = "0.0"; 

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy Characters contract
  console.log("Deploying Characters contract...");
  const Characters = await hre.ethers.getContractFactory("Characters");
  const characters = await Characters.deploy();
  await characters.waitForDeployment();
  const charactersAddress = await characters.getAddress();
  console.log("Characters deployed to:", charactersAddress);

  // Update Characters base price
  console.log("Updating Characters base price...");
  await characters.updateBasePrice(hre.ethers.parseEther(BASE_CHARACTER_PRICE));
  console.log("Characters base price updated");

  // Deploy Props contract
  console.log("Deploying Props contract...");
  const Props = await hre.ethers.getContractFactory("Props");
  const props = await Props.deploy();
  await props.waitForDeployment();
  const propsAddress = await props.getAddress();
  console.log("Props deployed to:", propsAddress);

  // Update Props base fee
  console.log("Updating Props base fee...");
  await props.updateBaseFee(hre.ethers.parseEther(BASE_PROP_FEE));
  console.log("Props base fee updated");

  // Deploy Scenes contract
  console.log("Deploying Scenes contract...");
  const Scenes = await hre.ethers.getContractFactory("Scenes");
  const scenes = await Scenes.deploy();
  await scenes.waitForDeployment();
  const scenesAddress = await scenes.getAddress();
  console.log("Scenes deployed to:", scenesAddress);

  // Update Scenes base fee
  console.log("Updating Scenes base fee...");
  await scenes.updateBaseFee(hre.ethers.parseEther(BASE_SCENE_FEE));
  console.log("Scenes base fee updated");

  // Deploy Comics contract
  console.log("Deploying Comics contract...");
  const Comics = await hre.ethers.getContractFactory("Comics");
  const comics = await Comics.deploy(charactersAddress);
  await comics.waitForDeployment();
  const comicsAddress = await comics.getAddress();
  console.log("Comics deployed to:", comicsAddress);

  // Update Comics base fee
  console.log("Updating Comics base fee...");
  await comics.updateBaseFee(hre.ethers.parseEther(BASE_COMIC_FEE), hre.ethers.parseEther(BASE_STRIP_FEE));
  console.log("Comics base fee updated");

  // Deploy Admin contract
  console.log("Deploying Admin contract...");
  const Admin = await hre.ethers.getContractFactory("Admin");
  const admin = await Admin.deploy(
    charactersAddress,
    propsAddress,
    comicsAddress,
    scenesAddress
  );
  await admin.waitForDeployment();
  const adminAddress = await admin.getAddress();
  console.log("Updating Admin prompt price...");
  await admin.updatePromptPrice(hre.ethers.parseEther(PROMPT_PRICE));
  console.log("Admin prompt price updated");

  // Save addresses to a JSON file
  const addresses = {
    admin: adminAddress,
    characters: charactersAddress,
    props: propsAddress,
    comics: comicsAddress,
    scenes: scenesAddress
  };

  const outputDir = path.join(__dirname, "..", "app", "constants");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(outputDir, "addresses.json"),
    JSON.stringify(addresses, null, 2)
  );

  console.log("Addresses saved to:", path.join(outputDir, "addresses.json"));
  console.log("\nPlease update these addresses in your .env file if needed");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
