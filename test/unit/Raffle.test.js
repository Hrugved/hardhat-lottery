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
          await expect(raffle.enterRaffle({ value: entranceFee })).to.be.revertedWith(
            "Raffle__NotOpen"
          )
        })
      })
      describe("checkUpkeep", function () {
        it("returns false if people havent sent any ETH", async function () {
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
          await network.provider.send("evm_mine", [])
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
          assert(!upkeepNeeded)
        })
        it("returns false if raffle isnt open", async function () {
          await raffle.enterRaffle({ value: entranceFee })
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
          await network.provider.send("evm_mine", [])
          await raffle.performUpkeep([])
          const raffleState = await raffle.getRaffleState()
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
          assert.equal(raffleState.toString(), "1")
          assert.equal(upkeepNeeded, false)
        })
        it("returns false if enough time hasn't passed", async function () {
          await raffle.enterRaffle({ value: entranceFee })
          await network.provider.send("evm_increaseTime", [interval.toNumber() - 1])
          await network.provider.send("evm_mine", [])
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
          assert.equal(upkeepNeeded, false)
        })
        it("returns true if enough time has passed, has players, eth, and is open", async function () {
          await raffle.enterRaffle({ value: entranceFee })
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
          await network.provider.send("evm_mine", [])
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x")
          assert.equal(upkeepNeeded, true)
        })
      })
      describe("performUpkeep", function () {
        it("it can only run if checkupkeep is true", async function () {
          await raffle.enterRaffle({ value: entranceFee })
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
          await network.provider.send("evm_mine", [])
          const tx = await raffle.performUpkeep([])
          assert(tx)
        })
        it("reverts when checkupkeep is false", async function () {
          await expect(raffle.performUpkeep([])).to.be.revertedWith("Raffle__UpkeepNotNeeded")
        })
        it("updates the raffle state. emits event and calls vrf coordinator", async function () {
          await raffle.enterRaffle({ value: entranceFee })
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
          await network.provider.send("evm_mine", [])
          const txResponse = await raffle.performUpkeep([])
          const txReceipt = await txResponse.wait(1)
          const requestId = txReceipt.events[1].args.requestId
          const raffleState = await raffle.getRaffleState()
          assert(requestId.toNumber() > 0)
          assert(raffleState.toString() == "1")
        })
      })
      describe("fulfillRandomWords", function () {
        beforeEach(async function () {
          await raffle.enterRaffle({ value: entranceFee })
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
          await network.provider.send("evm_mine", [])
        })
        it("can only be called after performUpkeep", async function () {
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
          ).to.be.revertedWith("nonexistent request")
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)
          ).to.be.revertedWith("nonexistent request")
        })
        it("picks a winner, resets the lottery and send the money", async function () {
          const additionalEntrants = 3
          const startingAccountIndex = 1
          const accounts = await ethers.getSigners()
          for (let i = startingAccountIndex; i < startingAccountIndex + additionalEntrants; i++) {
            const accountConnectedRaffle = raffle.connect(accounts[i])
            await accountConnectedRaffle.enterRaffle({ value: entranceFee })
          }
          const startingTimestamp = await raffle.getLastTimestamp()
          await new Promise(async (resolve, reject) => {
            raffle.once("WinnerPicked", async () => {
              try {
                const recentWinner = await raffle.getRecentWinner()
                const winnerEndingBalance = await accounts[1].getBalance()
                const raffleState = await raffle.getRaffleState()
                const endingTimestamp = await raffle.getLastTimestamp()
                const numPlayers = await raffle.getNumberOfPlayers()
                assert.equal(numPlayers.toString(), "0")
                assert.equal(raffleState.toString(), "0")
                assert.isTrue(endingTimestamp > startingTimestamp)
                assert.equal(
                  winnerEndingBalance.toString(),
                  winnerStartingBalance
                    .add(entranceFee.mul(additionalEntrants).add(entranceFee))
                    .toString()
                )
              } catch (e) {
                reject(e)
              }
              resolve()
            })
            const tx = await raffle.performUpkeep([])
            const txReceipt = await tx.wait(1)
            const winnerStartingBalance = await accounts[1].getBalance() // deterministic due to mocking
            await vrfCoordinatorV2Mock.fulfillRandomWords(
              txReceipt.events[1].args.requestId,
              raffle.address
            )
          })
        })
      })
    })
