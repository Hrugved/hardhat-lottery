import { useEffect, useState } from "react"
import { useMoralis, useWeb3Contract } from "react-moralis"
import { abi, contractAddresses } from "../constants"
import { ethers } from "ethers"
export default function LotteryEntrace() {
  const { chainId: chainIdHex, isWeb3Enabled } = useMoralis()
  const chainId = parseInt(chainIdHex)
  const raffleAddress = chainId in contractAddresses ? contractAddresses[chainId][0] : null
  const [entranceFee, setEntranceFee] = useState("0")
  const { runContractFunction: enterRaffle } = useWeb3Contract({
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
  useEffect(() => {
    if (isWeb3Enabled) {
      async function update() {
        const fee = (await getEntranceFee()).toString()
        setEntranceFee(fee)
      }
      update()
    }
  }, [isWeb3Enabled])
  return (
    <div>
      {raffleAddress ? (
        <div>
          <button onClick={async () => await enterRaffle()}>Enter Raffle</button>Entrance Fee {ethers.utils.formatUnits(entranceFee, "ether")} ETH</div>
      ) : (
        <div>no Raffle address detected</div>
      )} 
    </div>
  )
}
