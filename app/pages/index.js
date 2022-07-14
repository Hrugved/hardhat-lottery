import Head from "next/head"
import Image from "next/image"
import styles from "../styles/Home.module.css"
import Header from "../components/Header"

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Dapp Lottery</title>
        <meta name="description" content="powered by smart contracts" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header />
      hjello{" "}
    </div>
  )
}
