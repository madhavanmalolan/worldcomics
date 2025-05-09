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
              <Avatar className="h-6 w-6" />
              <Name />
            </ConnectWallet>
            <WalletDropdown>
              <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                <Avatar />
                <Name />
                <Address className={color.foregroundMuted} />
              </Identity>
              <WalletDropdownDisconnect />
            </WalletDropdown>
          </Wallet>
      </div>
    );
  }