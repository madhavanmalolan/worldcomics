import {
    ConnectWallet,
    Wallet,
    WalletDropdown,
    WalletDropdownDisconnect,
  } from '@coinbase/onchainkit/wallet';
  import {
    Address,
    Avatar,
    Name,
    Identity,
  } from '@coinbase/onchainkit/identity';
  import { color } from '@coinbase/onchainkit/theme';
  import { useAccount, useConnect } from 'wagmi';
  import { baseSepolia } from 'wagmi/chains';
   
  export function WalletComponents() {
    const { address, isConnected } = useAccount();
    const { connect, connectors } = useConnect();

    return (
      <div className="flex justify-end">
          <Wallet>
            <ConnectWallet>
              <Name />
              <WalletDropdownDisconnect />
            </ConnectWallet>
          </Wallet>
      </div>
    );
  }