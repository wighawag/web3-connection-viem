import type {
	ConnectedState,
	ConnectedNetworkState,
	GenericContractsInfos,
	ConnectedAccountState,
	ExecuteCallback,
} from 'web3-connection';
import {createPublicClient, createWalletClient, custom, getContract} from 'viem';
import type {
	WalletClient,
	PublicClient,
	GetContractReturnType,
	CustomTransport,
	Address,
	LocalAccount,
	Chain,
} from 'viem';

export type ViemContracts<ContractsTypes extends GenericContractsInfos, TAddress extends Address> = {
	[ContractName in keyof ContractsTypes]: GetContractReturnType<
		ContractsTypes[ContractName]['abi'],
		PublicClient<CustomTransport>,
		WalletClient<CustomTransport, Chain, LocalAccount<TAddress>>,
		TAddress
	>;
};

export function initViemContracts<ContractsInfos extends GenericContractsInfos>(
	execute: <T, TAddress extends Address>(
		callback: ExecuteCallback<ContractsInfos, TAddress, T>
		//options?: { requireUserConfirmation?: boolean }
	) => Promise<T | undefined>
) {
	return {
		execute<T, TAddress extends Address>(
			callback: (state: {
				connection: ConnectedState;
				account: ConnectedAccountState<TAddress>;
				network: ConnectedNetworkState<ContractsInfos>;
				contracts: ViemContracts<ContractsInfos, TAddress>;
				walletClient: WalletClient;
				publicClient: PublicClient;
			}) => Promise<T>
		) {
			return execute(async ({connection, network, account}) => {
				const transport = custom(connection.provider);
				const chain: Chain = {
					id: parseInt(network.chainId),
				} as Chain;
				const publicClient = createPublicClient({transport, chain});
				const walletClient = createWalletClient({
					transport,
					account: account.address,
					chain,
				});
				const anyContracts = network.contracts as GenericContractsInfos;
				const contracts: ViemContracts<ContractsInfos, TAddress> = Object.keys(network.contracts).reduce(
					(prev, curr) => {
						const contract = anyContracts[curr];
						const viemContract = getContract({...contract, walletClient, publicClient});

						(prev as any)[curr] = viemContract;
						return prev;
					},
					{} as ViemContracts<ContractsInfos, TAddress>
				);
				return callback({
					connection,
					account: account as ConnectedAccountState<TAddress>,
					network,
					publicClient,
					walletClient,
					contracts,
				});
			});
		},
	};
}
