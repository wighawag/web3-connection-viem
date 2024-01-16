import {
	ConnectedState,
	ConnectedNetworkState,
	GenericContractsInfos,
	ConnectedAccountState,
	ExecuteCallback,
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

type KeyedClient<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TAccount extends Account | undefined = Account | undefined,
> =
  | {
      public?: Client<TTransport, TChain>
      wallet: Client<TTransport, TChain, TAccount>
    }
  | {
      public: Client<TTransport, TChain>
      wallet?: Client<TTransport, TChain, TAccount>
    }


export type ViemContracts<ContractsTypes extends GenericContractsInfos, TAddress extends Address> = {
	[ContractName in keyof ContractsTypes]: GetContractReturnType<
		ContractsTypes[ContractName]['abi'],
		KeyedClient<CustomTransport>,
		TAddress
	>;
};

export function viemify<ContractsInfos extends GenericContractsInfos, TAddress extends Address = Address>({connection, account, network}: {
	connection: ConnectedState;
	account: ConnectedAccountState<TAddress>;
	network: ConnectedNetworkState<ContractsInfos>;
}): {
	connection: ConnectedState;
	account: ConnectedAccountState<TAddress>;
	network: ConnectedNetworkState<ContractsInfos>;
	contracts: ViemContracts<ContractsInfos, TAddress>;
	client: KeyedClient;
} {
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
				client: KeyedClient
			}) => Promise<T>
		) {
			return execute(async ({connection, network, account}) => {
				const viemified = viemify<ContractsInfos, TAddress>({connection, network, account: account as ConnectedAccountState<TAddress>});
				return callback(viemified);
			});
		},
	};
}
