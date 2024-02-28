import {
	ConnectedState,
	ConnectedNetworkState,
	GenericContractsInfos,
	ConnectedAccountState,
	ExecuteCallback,
	Web3ConnectionProvider,
} from 'web3-connection';
import {createPublicClient, createWalletClient, custom, getContract} from 'viem';
import type {
	GetContractReturnType,
	CustomTransport,
	Address,
	Chain,
	Transport,
	Account,
	Client,
} from 'viem';

type ClientPair<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TAccount extends Account | undefined = Account | undefined,
> ={
      public: Client<TTransport, TChain>
      wallet: Client<TTransport, TChain, TAccount>
    };


export type ViemContracts<ContractsTypes extends GenericContractsInfos, TAddress extends Address> = {
	[ContractName in keyof ContractsTypes]: GetContractReturnType<
		ContractsTypes[ContractName]['abi'],
		ClientPair<CustomTransport, Chain, Account<TAddress>>,
		TAddress
	>;
};

export function viemify<ContractsInfos extends GenericContractsInfos, TAddress extends Address = Address>({connection, account, network, providerOverride}: {
	connection: ConnectedState;
	account: ConnectedAccountState<TAddress>;
	network: ConnectedNetworkState<ContractsInfos>;
	providerOverride?: Web3ConnectionProvider;
}): {
	connection: ConnectedState;
	account: ConnectedAccountState<TAddress>;
	network: ConnectedNetworkState<ContractsInfos>;
	contracts: ViemContracts<ContractsInfos, TAddress>;
	client: ClientPair<CustomTransport, Chain, Account<TAddress>>;
} {

	
	const transport = custom(providerOverride ? providerOverride : connection.provider);
	const chain: Chain = {
		id: parseInt(network.chainId),
	} as Chain;
	const publicClient = createPublicClient({transport, chain});
	const walletClient = createWalletClient({
		transport,
		account: {
			address: account.address,
			type: 'json-rpc'
		  },
		chain,
	});
	const client = {wallet: walletClient, public: publicClient};
	const anyContracts = network.contracts as GenericContractsInfos;
	const contracts: ViemContracts<ContractsInfos, TAddress> = Object.keys(network.contracts).reduce(
		(prev, curr) => {
			const contract = anyContracts[curr];
			const viemContract = getContract({...contract, client});

			(prev as any)[curr] = viemContract;
			return prev;
		},
		{} as ViemContracts<ContractsInfos, TAddress>
	);
	return {
		connection,
		account: account as ConnectedAccountState<TAddress>,
		network,
		client,
		contracts,
	}
}

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
				client: ClientPair
			}) => Promise<T>
		) {
			return execute(async ({connection, network, account}) => {
				const viemified = viemify<ContractsInfos, TAddress>({connection, network, account: account as ConnectedAccountState<TAddress>});
				return callback(viemified);
			});
		},
	};
}
