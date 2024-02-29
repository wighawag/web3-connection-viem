import {
	ConnectedState,
	ConnectedNetworkState,
	GenericContractsInfos,
	ConnectedAccountState,
	ExecuteCallback,
	Web3ConnectionProvider,
	ChainInfo,
} from 'web3-connection';
import {createPublicClient, createWalletClient, custom, getContract} from 'viem';
import {
	chainConfig as opChainConfig,
	publicActionsL2,
	walletActionsL1,
	walletActionsL2,
	publicActionsL1,
	PublicActionsL2,
	PublicActionsL1,
	WalletActionsL1,
	WalletActionsL2,
} from 'viem/op-stack';
import {chainConfig as celoChainConfig} from 'viem/celo';
import {chainConfig as zksyncChainConfig, eip712WalletActions, Eip712WalletActions} from 'viem/zksync';
import type {
	GetContractReturnType,
	CustomTransport,
	Address,
	Chain,
	Transport,
	Account,
	Client,
	PublicClient,
	WalletClient,
} from 'viem';
import {ExtraPublicActions, extraActions} from './actions';

type ClientPair<
	TTransport extends Transport = Transport,
	TChain extends Chain | undefined = Chain | undefined,
	TAccount extends Account | undefined = Account | undefined
> = {
	public: Client<TTransport, TChain>;
	wallet: Client<TTransport, TChain, TAccount>;
};

export type ClientPairWithOptionalActions<TAddress extends Address> = ClientPair<
	CustomTransport,
	Chain,
	Account<TAddress>
> & {
	wallet:
		| WalletClient<CustomTransport, Chain, Account<TAddress>>
		| (WalletClient<CustomTransport, Chain, AccountType<TAddress>> &
				WalletActionsL2<Chain, AccountType<TAddress>> &
				WalletActionsL1<Chain, AccountType<TAddress>>)
		| (WalletClient<CustomTransport, Chain, AccountType<TAddress>> & Eip712WalletActions<Chain, AccountType<TAddress>>);

	public:
		| (PublicClient<CustomTransport, Chain> &
				PublicActionsL2<Chain> &
				PublicActionsL1<Chain> &
				ExtraPublicActions<Chain>)
		| PublicClient<CustomTransport, Chain>;
};

export type ViemContracts<
	ContractsTypes extends GenericContractsInfos,
	TChain extends Chain,
	TAddress extends Address
> = {
	[ContractName in keyof ContractsTypes]: GetContractReturnType<
		ContractsTypes[ContractName]['abi'],
		ClientPairWithOptionalActions<TAddress>,
		TAddress
	>;
};

export function fromChainInfoToChain(chainInfo: ChainInfo): Chain {
	switch (chainInfo.chainType) {
		case 'op-stack':
			return {...opChainConfig, ...chainInfo};
		case 'celo':
			return {...celoChainConfig, ...chainInfo};
		case 'zksync':
			return {...zksyncChainConfig, ...chainInfo};
		default:
			return {
				...chainInfo,
			};
	}
}

type AccountType<TAddress extends Address> = {
	address: TAddress;
	type: 'json-rpc';
};

export function viemify<
	ContractsInfos extends GenericContractsInfos,
	TChain extends Chain,
	TAddress extends Address = Address
>({
	connection,
	account,
	network,
	providerOverride,
}: {
	connection: ConnectedState;
	account: ConnectedAccountState<TAddress>;
	network: ConnectedNetworkState<ContractsInfos>;
	providerOverride?: Web3ConnectionProvider;
}): {
	connection: ConnectedState;
	account: ConnectedAccountState<TAddress>;
	network: ConnectedNetworkState<ContractsInfos>;
	contracts: ViemContracts<ContractsInfos, TChain, TAddress>;
	client: ClientPairWithOptionalActions<TAddress>;
} {
	const transport = custom(providerOverride ? providerOverride : connection.provider);
	const chain: Chain = fromChainInfoToChain(network.chainInfo);
	const viemAccount: AccountType<TAddress> = {
		address: account.address,
		type: 'json-rpc',
	};
	let publicClient = createPublicClient({transport, chain});
	let walletClient = createWalletClient({
		transport,
		account: viemAccount,
		chain,
	});

	let opPublicClient:
		| (PublicClient<CustomTransport, Chain> &
				PublicActionsL2<Chain> &
				PublicActionsL1<Chain> &
				ExtraPublicActions<Chain>)
		| undefined;
	let opWalletClient:
		| (WalletClient<CustomTransport, Chain, AccountType<TAddress>> &
				WalletActionsL2<Chain, AccountType<TAddress>> &
				WalletActionsL1<Chain, AccountType<TAddress>>)
		| undefined;
	if (network.chainInfo.chainType === 'op-stack') {
		opPublicClient = publicClient.extend(publicActionsL2()).extend(publicActionsL1()).extend(extraActions());
		publicClient = opPublicClient;
		opWalletClient = walletClient.extend(walletActionsL2()).extend(walletActionsL1());
		walletClient = opWalletClient;
	}

	let zksyncWalletClient:
		| (WalletClient<CustomTransport, Chain, AccountType<TAddress>> & Eip712WalletActions<Chain, AccountType<TAddress>>)
		| undefined;
	if (network.chainInfo.chainType === 'zksync') {
		zksyncWalletClient = walletClient.extend(eip712WalletActions());
		walletClient = zksyncWalletClient;
	}

	const client = {wallet: opWalletClient || zksyncWalletClient || walletClient, public: opPublicClient || publicClient};
	const anyContracts = network.contracts as GenericContractsInfos;
	const contracts: ViemContracts<ContractsInfos, TChain, TAddress> = Object.keys(network.contracts).reduce(
		(prev, curr) => {
			const contract = anyContracts[curr];
			const viemContract = getContract({...contract, client});

			(prev as any)[curr] = viemContract;
			return prev;
		},
		{} as ViemContracts<ContractsInfos, TChain, TAddress>
	);
	return {
		connection,
		account: account as ConnectedAccountState<TAddress>,
		network,
		client,
		contracts,
	};
}

export function initViemContracts<ContractsInfos extends GenericContractsInfos>(
	execute: <T, TAddress extends Address>(
		callback: ExecuteCallback<ContractsInfos, TAddress, T>
		//options?: { requireUserConfirmation?: boolean }
	) => Promise<T | undefined>
) {
	return {
		execute<T, TChain extends Chain, TAddress extends Address>(
			callback: (state: {
				connection: ConnectedState;
				account: ConnectedAccountState<TAddress>;
				network: ConnectedNetworkState<ContractsInfos>;
				contracts: ViemContracts<ContractsInfos, TChain, TAddress>;
				client: ClientPairWithOptionalActions<TAddress>;
			}) => Promise<T>
		) {
			return execute(async ({connection, network, account}) => {
				const viemified = viemify<ContractsInfos, TChain, TAddress>({
					connection,
					network,
					account: account as ConnectedAccountState<TAddress>,
				});
				return callback(viemified);
			});
		},
	};
}
