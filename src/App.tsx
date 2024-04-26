
import { useState } from 'react'
import './App.css'
import { FileUploader } from "react-drag-drop-files";
import { createPublicClient, createWalletClient, custom, http } from 'viem'
import { sepolia } from 'viem/chains'
import  { verifyDKIMSignature } from '@zk-email/helpers/dist/dkim'
import { CONTRACT_ABI, CONTRACT_ADDRESS, MAGIC_KEY, EXPLORER_URL } from './config'

declare global {
  interface Window {
    ethereum:any;
  }
}

window.setImmediate = (fn, ...args) => fn(...args)


const publicClient = createPublicClient({
  chain: sepolia,
  transport: http()
})

const client = createWalletClient({
  chain: sepolia,
  transport: custom(window.ethereum!)
})

const fileTypes = ["EML"];

function App() {
  const [step, setStep] = useState(1)
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const handleChange = async (file: File) => {
    setErrorMessage
    
    //check file type
    if (!file.name.endsWith('.eml')) {
      setErrorMessage('Invalid file type')
      return
    }
    try {
      const emailText = await file.text()
      const dkimResult = await verifyDKIMSignature(emailText)

      const emailMessage = new TextDecoder().decode(dkimResult.message);

      if(!(dkimResult.signingDomain == "gmail.com") || 
        !(emailMessage.includes('from:Maxwell Foley <maxwellsfoley@gmail.com'))) {
        setErrorMessage("The email is not from Maxwell Foley")
        return
      } 
      if(!emailText.includes('hello world')) {  
        setErrorMessage("Email body does not contain 'hello world'")
        return
      }
      
      setStep(2);
    } catch (e) {
      setErrorMessage("Error extracting data from email file")
    }
  };

  async function connect() {
    setErrorMessage(null)
    try { 
      await client.requestAddresses()
      setStep(3)
    } catch (e) {
      console.error("e", e.message)
      setErrorMessage("An error occurred connecting to wallet")
    }
  }

  async function sendProof() {
    setErrorMessage(null)
    const [account] = await client.getAddresses()
    try {
      const { request, result } = await publicClient.simulateContract({
        account,
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'verify',
        args: [MAGIC_KEY]
      })

      if (!result) {
        setErrorMessage("Proof not accepted by contract")
        return
      }

      const txResult = await client.writeContract(request)
      setTxHash(txResult)
      setStep(4)
    } catch (e) {
      setErrorMessage("An error occurred sending the transaction" + e.message)
    }
  }

  return (
    <div className="app">
      <>
      <h2>Proof of Email</h2>
      {
        step === 1 && (
          <div>
            <h3>Step 1: Upload file</h3>
            <FileUploader handleChange={handleChange} name="file" types={fileTypes} />
          </div>
        )
      }
      </>
      <>
      {
        step === 2 && (
          <div>
            <h3>Step 2: Connect wallet</h3>
            <div><button onClick={() => connect()}>Connect Wallet</button></div>
            <div><button onClick={() => {
              setStep(1)
              setErrorMessage(null)
            }}>Back</button></div>
          </div>
        )
      }
      {
        step === 3 && (
          <div>
            <h3>Step 3: Send proof to blockchain</h3>
            <div><button onClick={() => sendProof()}>Send Proof</button></div>
          </div>
        )
      }
      {
        step === 4 && (
          <div>
            <div>All done! Your transaction is recorded <a href={`${EXPLORER_URL}${txHash}`}>here</a> 🌸</div>
            <div><button onClick={() => setStep(1)}>Restart</button></div>
          </div>
        )
      }
      <div>
      {
        errorMessage ? errorMessage : null
      }
      </div>  

      </>
    </div>
  );
}

export default App
