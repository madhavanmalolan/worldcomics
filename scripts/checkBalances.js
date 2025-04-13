const hre = require("hardhat");

async function main() {
  const [deployer, ...accounts] = await hre.ethers.getSigners();
  
  console.log("Checking balances on Base Sepolia...");
  
  // Check deployer balance
  const deployerBalance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Deployer (${deployer.address}) balance:`, 
    hre.ethers.formatEther(deployerBalance), "ETH");
  
  // Check other accounts if they exist
  if (accounts.length > 0) {
    console.log("\nOther accounts:");
    for (let i = 0; i < accounts.length; i++) {
      const balance = await hre.ethers.provider.getBalance(accounts[i].address);
      console.log(`Account ${i + 1} (${accounts[i].address}) balance:`, 
        hre.ethers.formatEther(balance), "ETH");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 