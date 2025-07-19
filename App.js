import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Dashboard from './components/Dashboard';
import InsuranceContract from './contracts/Insurance.json';

function App() {
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);
  const [isInsurer, setIsInsurer] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPendingRequest, setIsPendingRequest] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const handleAccountsChanged = (accounts) => {
      if (isMounted) {
        setAccount(accounts[0] || '');
        if (!accounts[0]) {
          setContract(null);
          setIsInsurer(false);
        }
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    const loadBlockchainData = async () => {
      if (!window.ethereum) {
        if (isMounted) {
          setError('MetaMask not detected. Please install MetaMask extension.');
          setIsLoading(false);
        }
        return;
      }

      try {
        // Check existing accounts first
        const initialAccounts = await window.ethereum.request({ 
          method: 'eth_accounts' 
        });

        if (initialAccounts.length > 0) {
          if (isMounted) setAccount(initialAccounts[0]);
        } else {
          // Check for pending requests
          const permissions = await window.ethereum.request({
            method: 'wallet_getPermissions'
          });
          
          if (permissions.some(p => p.parentCapability === 'eth_accounts')) {
            if (isMounted) setIsPendingRequest(true);
            return;
          }

          // No pending request, proceed with connection
          try {
            const accounts = await window.ethereum.request({ 
              method: 'eth_requestAccounts' 
            });
            if (isMounted) setAccount(accounts[0]);
          } catch (err) {
            if (err.code === -32002) {
              if (isMounted) setIsPendingRequest(true);
              return;
            }
            throw err;
          }
        }

        // Set up provider and contract
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const network = await provider.getNetwork();

        const contractAddress = InsuranceContract.networks[network.chainId]?.address;
        if (!contractAddress) {
          throw new Error('Contract not deployed on this network');
        }

        const insuranceContract = new ethers.Contract(
          contractAddress,
          InsuranceContract.abi,
          signer
        );

        // Check insurer status
        const insurer = await insuranceContract.insurer();
        const currentAccount = await signer.getAddress();
        const insurerStatus = currentAccount.toLowerCase() === insurer.toLowerCase();

        if (isMounted) {
          setContract(insuranceContract);
          setIsInsurer(insurerStatus);
          setIsLoading(false);
          setIsPendingRequest(false);
        }

      } catch (error) {
        if (isMounted) {
          console.error('Error:', error);
          setError(error.message);
          setIsLoading(false);
          
          if (error.code === -32002) {
            setIsPendingRequest(true);
          }
        }
      }
    };

    // Add event listeners
    window.ethereum?.on('accountsChanged', handleAccountsChanged);
    window.ethereum?.on('chainChanged', handleChainChanged);

    loadBlockchainData();

    return () => {
      isMounted = false;
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  if (isPendingRequest) {
    return (
      <div className="pending-container">
        <h2>Pending MetaMask Request</h2>
        <p>Please complete the connection request in your MetaMask wallet</p>
        <button 
          onClick={() => window.location.reload()}
          className="refresh-button"
        >
          I've completed it - Refresh Page
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        {!window.ethereum && (
          <a 
            href="https://metamask.io/download.html" 
            target="_blank" 
            rel="noopener noreferrer"
            className="metamask-link"
          >
            Install MetaMask
          </a>
        )}
        <button 
          onClick={() => window.location.reload()}
          className="retry-button"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Loading blockchain data...</p>
      </div>
    );
  }

  return (
    <div className="App">
      <header>
        <h1>Blockchain Insurance Demo</h1>
        <div className="account-info">
          <p>Connected account: {account}</p>
          {isInsurer && <span className="insurer-badge">(Insurer Account)</span>}
        </div>
      </header>

      <main>
        {contract ? (
          <Dashboard 
            account={account} 
            contract={contract} 
            isInsurer={isInsurer} 
          />
        ) : (
          <p className="connecting-message">Connecting to contract...</p>
        )}
      </main>
    </div>
  );
}

export default App;