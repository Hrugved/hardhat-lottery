import { useEffect, useState } from "react"
import { useMoralis, useWeb3Contract } from "react-moralis"
import { abi, contractAddresses } from "../constants"
import { ethers } from "ethers"
import { useNotification } from "web3uikit"
export default function LotteryEntrace() {
  const { chainId: chainIdHex, isWeb3Enabled } = useMoralis()
  const chainId = parseInt(chainIdHex)
  const raffleAddress = chainId in contractAddresses ? contractAddresses[chainId][0] : null
  const dispatch = useNotification()
  const [entranceFee, setEntranceFee] = useState("0")
  const [numberOfPlayers, setNumberOfPlayers] = useState("0")
  const [recentWinner, setRecentWinner] = useState("")

  const {
    runContractFunction: enterRaffle,
    isLoading,
    isFetching,
  } = useWeb3Contract({
    abi: abi,
    contractAddress: raffleAddress,
    functionName: "enterRaffle",
    params: {},
    msgValue: entranceFee,
  })

  const { runContractFunction: getEntranceFee } = useWeb3Contract({
    abi: abi,
    contractAddress: raffleAddress,
    functionName: "getEntranceFee",
    params: {},
  })

  const { runContractFunction: getNumberOfPlayers } = useWeb3Contract({
    abi: abi,
    contractAddress: raffleAddress,
    functionName: "getNumberOfPlayers",
    params: {},
  })

  const { runContractFunction: getRecentWinner } = useWeb3Contract({
    abi: abi,
    contractAddress: raffleAddress,
    functionName: "getRecentWinner",
    params: {},
  })

  useEffect(() => {
    if (isWeb3Enabled) {
      update()
    }
  }, [isWeb3Enabled])

  async function update() {
    const _fee = (await getEntranceFee()).toString()
    const _numberOfPlayers = (await getNumberOfPlayers()).toString()
    const _recentWinner = await getRecentWinner()
    setEntranceFee(_fee)
    setNumberOfPlayers(_numberOfPlayers)
    setRecentWinner(_recentWinner)
  }

  const handleSuccess = async function (tx) {
    await tx.wait(1)
    handleNewNotification(tx)
    update()
  }

  const handleNewNotification = function () {
    dispatch({
      type: "info",
      message: "transaction complete",
      title: "Tx notification",
      position: "topR",
      icon: "bell",
    })
  }

  return (
    <div className="p-5">
      {raffleAddress ? (
        <div>
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ml-auto"
            onClick={async function () {
              await enterRaffle({
                onSuccess: handleSuccess,
                onError: (e) => console.log(e),
              })
            }}
            disabled={isLoading || isFetching}
          >
            {isLoading || isFetching ? (
              <div className="animate-spin spinner-border h-8 w-8 border-b-2 rounded-full"></div>
            ) : (
              <div>Enter Raffle</div>
            )}
          </button>
          <div>Entrance Fee {ethers.utils.formatUnits(entranceFee, "ether")} ETH Number Of Players{" "}</div>
          <div>{numberOfPlayers}</div>
          <div>Recent Winner {recentWinner}</div>
        </div>
      ) : (
        <div>no Raffle address detected</div>
      )}
    </div>
  )
}
