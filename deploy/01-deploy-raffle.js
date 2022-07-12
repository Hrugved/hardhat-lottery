const { verify } = require("../utils/verfiy")
const { network, ethers } = require("hardhat")
const { devChains, networkConfig } = require("../helper-hardhat-config.js")

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("2")

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()
  const chainId = network.config.chainId
  let VRFCoordinatorV2Address, subscriptionId
  if (devChains.includes(network.name)) {
    const VRFCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
    VRFCoordinatorV2Address = VRFCoordinatorV2Mock.address
    const transactionReceipt = await VRFCoordinatorV2Mock.createSubscription()
    const transactionResponse = await transactionReceipt.wait(1)
    subscriptionId = transactionResponse.events[0].args.subId
    await VRFCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT)
  } else {
    VRFCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"]
    subscriptionId = networkConfig[chainId]["subscriptionId"]
  }
  const entranceFee = networkConfig[chainId]["entranceFee"]
  const gasLane = networkConfig[chainId]["gasLane"]
  const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"]
  const interval = networkConfig[chainId]["interval"]
  const args = [
    entranceFee,
    VRFCoordinatorV2Address,
    gasLane,
    subscriptionId,
    callbackGasLimit,
    interval,
  ]
  const raffle = await deploy("Raffle", {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  })
  if(!devChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    log('verifying on etherscan...')
    await verify(raffle.address,args)
  }
  log('-----------------------------------------------------------')
}

module.exports.tags = ['all','raffle']
