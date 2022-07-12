const { assert, expect } = require("chai")
const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { devChains, networkConfig } = require("../../helper-hardhat-config")

!devChains.includes(network.name)
  ? describe.skip
  : describe("raffle unit tests", async function () {
      let raffle
      let vrfCoordinatorV2Mock
      let deployer
      let entranceFee
      let interval
      const chainId = network.config.chainId
      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer
        await deployments.fixture(["all"])
        raffle = await ethers.getContract("Raffle", deployer)
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
        entranceFee = await raffle.getEntranceFee()
        interval = await raffle.getInterval()
      })
      describe("constructor", function () {
        it("initializes the raffle correctly", async function () {
          const raffleState = await raffle.getRaffleState()
          assert.equal(raffleState.toString(), "0")
          assert.equal(interval, networkConfig[chainId]["interval"])
        })
      })
      describe("enterRaffle", function () {
        it("reverts when not paid enough", async function () {
          await expect(raffle.enterRaffle()).to.be.revertedWith("Raffle__NotEnoughETHEntered")
        })
        it("records player when they enter", async function () {
          await raffle.enterRaffle({ value: entranceFee })
          const player = await raffle.getPlayer(0)
          assert.equal(player, deployer)
        })
        it("emits event on enter", async function () {
          await expect(raffle.enterRaffle({ value: entranceFee })).to.emit(raffle, "RaffleEnter")
        })
        it("prohibits entry when raffle is calculating", async function () {
          await raffle.enterRaffle({ value: entranceFee })
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
          await network.provider.send("evm_mine", [])
          await raffle.performUpkeep([])
          await expect(raffle.enterRaffle({ value: entranceFee })).to.be.revertedWith("Raffle__NotOpen")
        })
      })
      describe('checkUpkeep', function() {
        it('returns false if people havent sent any ETH',async function() {
          await network.provider.send('evm_increaseTime',[interval.toNumber()+1])
          await network.provider.send('evm_mine',[])
          const {upkeepNeeded} = await raffle.callStatic.checkUpkeep([])
          assert(!upkeepNeeded)
        })
        it('returns false if raffle isnt open',async function() {
          await raffle.enterRaffle({ value: entranceFee })
          await network.provider.send('evm_increaseTime',[interval.toNumber()+1])
          await network.provider.send('evm_mine',[])
          await raffle.performUpkeep([])
          const raffleState = await raffle.getRaffleState()
          const {upkeepNeeded} = await raffle.callStatic.checkUpkeep([])
          assert.equal(raffleState.toString(),'1')
          assert.equal(upkeepNeeded,false)
        })
        it("returns false if enough time hasn't passed", async function() {
            await raffle.enterRaffle({ value: entranceFee })
            await network.provider.send('evm_increaseTime',[interval.toNumber()-1])
            await network.provider.send('evm_mine',[])
            const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]) 
            assert.equal(upkeepNeeded,false)
        })
        it("returns true if enough time has passed, has players, eth, and is open", async function() {
            await raffle.enterRaffle({ value: entranceFee })
            await network.provider.send('evm_increaseTime',[interval.toNumber()+1])
            await network.provider.send('evm_mine',[])
            const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") 
            assert.equal(upkeepNeeded,true)
        })
      })
    })
