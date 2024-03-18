import {
	ConnectedState,
	ConnectedNetworkState,
	GenericContractsInfos,
	ConnectedAccountState,
	ExecuteCallback,
	Web3ConnectionProvider,
	ChainInfo,
} from 'web3-connection';
import {createPublicClient, createWalletClient, custom} from 'viem';
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

export type ViemContracts<ContractsTypes extends GenericContractsInfos, TAddress extends Address> = {
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

export function createViemPublicClient({
	chainInfo,
	connection,
	providerOverride,
}: {
	chainInfo: ChainInfo;
	connection: ConnectedState;
	providerOverride?: Web3ConnectionProvider;
}):
	| (PublicClient<CustomTransport, Chain> & PublicActionsL2<Chain> & PublicActionsL1<Chain> & ExtraPublicActions<Chain>)
	| PublicClient<CustomTransport, Chain> {
	const transport = custom(providerOverride ? providerOverride : connection.provider);
	const chain: Chain = fromChainInfoToChain(chainInfo);
	let publicClient = createPublicClient({transport, chain});

	let opPublicClient:
		| (PublicClient<CustomTransport, Chain> &
				PublicActionsL2<Chain> &
				PublicActionsL1<Chain> &
				ExtraPublicActions<Chain>)
		| undefined;

	if (chainInfo.chainType === 'op-stack') {
		opPublicClient = publicClient.extend(publicActionsL2()).extend(publicActionsL1()).extend(extraActions());
		publicClient = opPublicClient;
	}

	return opPublicClient || publicClient;
}

export function createViemWalletClient<TAddress extends Address = Address>({
	chainInfo,
	account,
	connection,
	providerOverride,
}: {
	chainInfo: ChainInfo;
	connection: ConnectedState;
	account: ConnectedAccountState<TAddress>;
	providerOverride?: Web3ConnectionProvider;
}):
	| WalletClient<CustomTransport, Chain, Account<TAddress>>
	| (WalletClient<CustomTransport, Chain, AccountType<TAddress>> &
			WalletActionsL2<Chain, AccountType<TAddress>> &
			WalletActionsL1<Chain, AccountType<TAddress>>)
	| (WalletClient<CustomTransport, Chain, AccountType<TAddress>> & Eip712WalletActions<Chain, AccountType<TAddress>>) {
	const transport = custom(providerOverride ? providerOverride : connection.provider);
	const chain: Chain = fromChainInfoToChain(chainInfo);
	const viemAccount: AccountType<TAddress> = {
		address: account.address,
		type: 'json-rpc',
	};
	let walletClient = createWalletClient({
		transport,
		account: viemAccount,
		chain,
	});

	let opWalletClient:
		| (WalletClient<CustomTransport, Chain, AccountType<TAddress>> &
				WalletActionsL2<Chain, AccountType<TAddress>> &
				WalletActionsL1<Chain, AccountType<TAddress>>)
		| undefined;
	if (chainInfo.chainType === 'op-stack') {
		opWalletClient = walletClient.extend(walletActionsL2()).extend(walletActionsL1());
		walletClient = opWalletClient;
	}

	let zksyncWalletClient:
		| (WalletClient<CustomTransport, Chain, AccountType<TAddress>> & Eip712WalletActions<Chain, AccountType<TAddress>>)
		| undefined;
	if (chainInfo.chainType === 'zksync') {
		zksyncWalletClient = walletClient.extend(eip712WalletActions());
		walletClient = zksyncWalletClient;
	}

	return opWalletClient || zksyncWalletClient || walletClient;
}

export function viemify<ContractsInfos extends GenericContractsInfos, TAddress extends Address = Address>({
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
	client: ClientPairWithOptionalActions<TAddress>;
} {
	let publicClient = createViemPublicClient({
		chainInfo: network.chainInfo,
		connection,
		providerOverride,
	});
	let walletClient = createViemWalletClient({
		chainInfo: network.chainInfo,
		account,
		connection,
		providerOverride,
	});
	const client = {wallet: walletClient, public: publicClient};
	return {
		connection,
		account: account as ConnectedAccountState<TAddress>,
		network,
		client,
	};
}

export function initViemClientExecution<ContractsInfos extends GenericContractsInfos>(
	execute: <T, TAddress extends Address>(
		callback: ExecuteCallback<ContractsInfos, TAddress, T>
	) => Promise<T | undefined>
) {
	return {
		execute<T, TAddress extends Address>(
			callback: (state: {
				connection: ConnectedState;
				account: ConnectedAccountState<TAddress>;
				network: ConnectedNetworkState<ContractsInfos>;
				client: ClientPairWithOptionalActions<TAddress>;
			}) => Promise<T>
		) {
			return execute(async ({connection, network, account}) => {
				const viemified = viemify<ContractsInfos, TAddress>({
					connection,
					network,
					account: account as ConnectedAccountState<TAddress>,
				});
				return callback(viemified);
			});
		},
	};
}
