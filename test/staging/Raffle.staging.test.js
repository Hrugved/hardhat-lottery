const { assert, expect } = require("chai")
const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { isCallTrace } = require("hardhat/internal/hardhat-network/stack-traces/message-trace")
const { devChains, networkConfig } = require("../../helper-hardhat-config")

devChains.includes(network.name)
  ? describe.skip
  : describe("raffle staging tests", async function () {
      let raffle
      let deployer
      let entranceFee
      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer
        raffle = await ethers.getContract("Raffle", deployer)
        entranceFee = await raffle.getEntranceFee()
      })
      describe("fulfillRandomWords", function () {
        it("works with live chainlink keepers and chainlink vrf and we get a random winner", async function () {
          const startingTimestamp = await raffle.getLatestTimestamp()
          await new Promise(async (resolve, reject) => {
            raffle.once("WinnerPicked", async () => {
              try {
                const raffleState = await raffle.getRaffleState()
                const winnerEndingBalance = await deployer.getBalance()
                const endingTimestamp = await raffle.getBalance()
                const numPlayers = await raffle.getNumberOfPlayers()
                assert.equal(numPlayers.toString(), "0")
                assert.equal(raffleState.toString(), "0")
                assert.isTrue(endingTimestamp > startingTimestamp)
                assert.equal(
                  winnerEndingBalance.toString(),
                  winnerStartingBalance
                    .add(entranceFee)
                    .toString()
                )
                resolve()
              } catch (e) {
                reject(e)
              }
            })
            await raffle.enterRaffle({value: entranceFee})
            const winnerStartingBalance = await deployer.getBalance()
          })
        })
      })
    })
