import type {
	Abi,
	AbiFunction,
	AbiParametersToPrimitiveTypes,
	Address,
	ExtractAbiEventNames,
	ExtractAbiFunction,
	ExtractAbiFunctionNames,
} from 'abitype';

// import {IsNarrowable, IsNever} from 'abitype/dist/types/types';

/**
 * Checks if {@link T} is `unknown`
 *
 * @param T - Type to check
 * @returns `true` if {@link T} is `unknown`, otherwise `false`
 *
 * @example
 * type Result = IsUnknown<unknown>
 * //   ^? type Result = true
 */
export type IsUnknown<T> = unknown extends T ? true : false;
/**
 * Checks if {@link T} can be narrowed further than {@link U}
 *
 * @param T - Type to check
 * @param U - Type to against
 *
 * @example
 * type Result = IsNarrowable<'foo', string>
 * //   ^? true
 */
export type IsNarrowable<T, U> = IsUnknown<T> extends true
	? false
	: IsNever<(T extends U ? true : false) & (U extends T ? false : true)> extends true
	? false
	: true;

/**
 * Checks if {@link T} is `never`
 *
 * @param T - Type to check
 *
 * @example
 * type Result = IsNever<never>
 * //   ^? type Result = true
 */
export type IsNever<T> = [T] extends [never] ? true : false;

import {
	Account,
	Chain,
	Client,
	ContractFunctionArgs,
	ContractFunctionName,
	EstimateContractGasParameters,
	Transport,
} from 'viem';
import {EstimateContractGasReturnType, estimateContractGas} from 'viem/_types/actions/public/estimateContractGas';
import {IsUndefined, Or, Prettify, UnionOmit} from 'viem/_types/types/utils';
import {ErrorType} from 'viem/errors/utils';
import {getAction} from 'viem/utils';

type KeyedClient<
	TTransport extends Transport = Transport,
	TChain extends Chain | undefined = Chain | undefined,
	TAccount extends Account | undefined = Account | undefined
> =
	| {
			public?: Client<TTransport, TChain>;
			wallet: Client<TTransport, TChain, TAccount>;
	  }
	| {
			public: Client<TTransport, TChain>;
			wallet?: Client<TTransport, TChain, TAccount>;
	  };

export type GetContractParameters<
	TTransport extends Transport = Transport,
	TChain extends Chain | undefined = Chain | undefined,
	TAccount extends Account | undefined = Account | undefined,
	TAbi extends Abi | readonly unknown[] = Abi,
	TClient extends Client<TTransport, TChain, TAccount> | KeyedClient<TTransport, TChain, TAccount> =
		| Client<TTransport, TChain, TAccount>
		| KeyedClient<TTransport, TChain, TAccount>,
	TAddress extends Address = Address
> = {
	/** Contract ABI */
	abi: TAbi;
	/** Contract address */
	address: TAddress;
	/** The Client.
	 *
	 * If you pass in a [`publicClient`](https://viem.sh/docs/clients/public), the following methods are available:
	 *
	 * - [`createEventFilter`](https://viem.sh/docs/contract/createContractEventFilter)
	 * - [`estimateGas`](https://viem.sh/docs/contract/estimateContractGas)
	 * - [`getEvents`](https://viem.sh/docs/contract/getContractEvents)
	 * - [`read`](https://viem.sh/docs/contract/readContract)
	 * - [`simulate`](https://viem.sh/docs/contract/simulateContract)
	 * - [`watchEvent`](https://viem.sh/docs/contract/watchContractEvent)
	 *
	 * If you pass in a [`walletClient`](https://viem.sh/docs/clients/wallet), the following methods are available:
	 *
	 * - [`estimateGas`](https://viem.sh/docs/contract/estimateContractGas)
	 * - [`write`](https://viem.sh/docs/contract/writeContract)
	 */
	client: TClient;
};

export type GetContractReturnType<
	TAbi extends Abi | readonly unknown[] = Abi,
	TClient extends Client | KeyedClient = Client | KeyedClient,
	TAddress extends Address = Address,
	_EventNames extends string = TAbi extends Abi ? (Abi extends TAbi ? string : ExtractAbiEventNames<TAbi>) : string,
	_ReadFunctionNames extends string = TAbi extends Abi
		? Abi extends TAbi
			? string
			: ExtractAbiFunctionNames<TAbi, 'pure' | 'view'>
		: string,
	_WriteFunctionNames extends string = TAbi extends Abi
		? Abi extends TAbi
			? string
			: ExtractAbiFunctionNames<TAbi, 'nonpayable' | 'payable'>
		: string,
	_Narrowable extends boolean = IsNarrowable<TAbi, Abi>,
	_PublicClient extends Client | unknown = TClient extends {
		public: Client;
	}
		? TClient['public']
		: TClient,
	_WalletClient extends Client | unknown = TClient extends {
		wallet: Client;
	}
		? TClient['wallet']
		: TClient
> = Prettify<
	Prettify<
		(_PublicClient extends Client
			? (IsNever<_ReadFunctionNames> extends true ? unknown : {}) &
					(IsNever<_WriteFunctionNames> extends true
						? unknown
						: {
								/**
								 * Estimates the various fees necessary to complete a transaction without submitting it to the network.
								 *
								 * @example
								 * import { createPublicClient, getContract, http, parseAbi } from 'viem'
								 * import { mainnet } from 'viem/chains'
								 *
								 * const publicClient = createPublicClient({
								 *   chain: mainnet,
								 *   transport: http(),
								 * })
								 * const contract = getContract({
								 *   address: '0xFBA3912Ca04dd458c843e2EE08967fC04f3579c2',
								 *   abi: parseAbi(['function mint() public']),
								 *   client: publicClient,
								 * })
								 * const {gas, l1BaseFee, l1GasFee} = await contract.estimateAllFees.mint({
								 *   account: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
								 * })
								 */
								estimateAllFees: {
									[functionName in _WriteFunctionNames]: GetEstimateFunction<
										_Narrowable,
										_PublicClient['chain'],
										undefined,
										TAbi,
										functionName extends ContractFunctionName<TAbi, 'nonpayable' | 'payable'> ? functionName : never
									>;
								};
						  }) &
					(IsNever<_EventNames> extends true ? unknown : {})
			: unknown) &
			(_WalletClient extends Client
				? IsNever<_WriteFunctionNames> extends true
					? unknown
					: {
							/**
							 * Estimates the all the fees necessary to complete a transaction without submitting it to the network.
							 *
							 * @example
							 * import { createWalletClient, getContract, http, parseAbi } from 'viem'
							 * import { mainnet } from 'viem/chains'
							 *
							 * const walletClient = createWalletClient({
							 *   chain: mainnet,
							 *   transport: http(),
							 * })
							 * const contract = getContract({
							 *   address: '0xFBA3912Ca04dd458c843e2EE08967fC04f3579c2',
							 *   abi: parseAbi(['function mint() public']),
							 *   client: walletClient,
							 * })
							 * const {gas, l1BaseFee, l1GasFee} = await contract.estimateAllFees.mint({
							 *   account: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
							 * })
							 */
							estimateAllFees: {
								[functionName in _WriteFunctionNames]: GetEstimateFunction<
									_Narrowable,
									_WalletClient['chain'],
									_WalletClient['account'],
									TAbi,
									functionName extends ContractFunctionName<TAbi, 'nonpayable' | 'payable'> ? functionName : never
								>;
							};
					  }
				: unknown)
	> & {address: TAddress; abi: TAbi}
>;

export type GetContractErrorType = ErrorType;

/**
 * Gets type-safe interface for performing contract-related actions with a specific `abi` and `address`.
 *
 * - Docs https://viem.sh/docs/contract/getContract
 *
 * Using Contract Instances can make it easier to work with contracts if you don't want to pass the `abi` and `address` properites every time you perform contract actions, e.g. [`readContract`](https://viem.sh/docs/contract/readContract), [`writeContract`](https://viem.sh/docs/contract/writeContract), [`estimateContractGas`](https://viem.sh/docs/contract/estimateContractGas), etc.
 *
 * @example
 * import { createPublicClient, getContract, http, parseAbi } from 'viem'
 * import { mainnet } from 'viem/chains'
 *
 * const publicClient = createPublicClient({
 *   chain: mainnet,
 *   transport: http(),
 * })
 * const contract = getContract({
 *   address: '0xFBA3912Ca04dd458c843e2EE08967fC04f3579c2',
 *   abi: parseAbi([
 *     'function balanceOf(address owner) view returns (uint256)',
 *     'function ownerOf(uint256 tokenId) view returns (address)',
 *     'function totalSupply() view returns (uint256)',
 *   ]),
 *   client: publicClient,
 * })
 */
export function getContract<
	TTransport extends Transport,
	TAddress extends Address,
	const TAbi extends Abi | readonly unknown[],
	const TClient extends Client<TTransport, TChain, TAccount> | KeyedClient<TTransport, TChain, TAccount>,
	TChain extends Chain | undefined = Chain | undefined,
	TAccount extends Account | undefined = Account | undefined
>({
	abi,
	address,
	client: client_,
}: GetContractParameters<TTransport, TChain, TAccount, TAbi, TClient, TAddress>): GetContractReturnType<
	TAbi,
	TClient,
	TAddress
> {
	const client = client_ as Client<TTransport, TChain, TAccount> | KeyedClient<TTransport, TChain, TAccount>;

	const [publicClient, walletClient] = (() => {
		if (!client) return [undefined, undefined];
		if ('public' in client && 'wallet' in client) return [client.public as Client, client.wallet as Client];
		if ('public' in client) return [client.public as Client, undefined];
		if ('wallet' in client) return [undefined, client.wallet as Client];
		return [client, client];
	})();

	const hasPublicClient = publicClient !== undefined && publicClient !== null;
	const hasWalletClient = walletClient !== undefined && walletClient !== null;

	const contract: {
		[_ in
			| 'abi'
			| 'address'
			| 'createEventFilter'
			| 'estimateGas'
			| 'estimateAllFees'
			| 'getEvents'
			| 'read'
			| 'simulate'
			| 'watchEvent'
			| 'write']?: unknown;
	} = {};

	let hasReadFunction = false;
	let hasWriteFunction = false;
	let hasEvent = false;
	for (const item of abi as Abi) {
		if (item.type === 'function')
			if (item.stateMutability === 'view' || item.stateMutability === 'pure') hasReadFunction = true;
			else hasWriteFunction = true;
		else if (item.type === 'event') hasEvent = true;
		// Exit early if all flags are `true`
		if (hasReadFunction && hasWriteFunction && hasEvent) break;
	}

	if (hasPublicClient || hasWalletClient)
		if (hasWriteFunction) {
			contract.estimateAllFees = new Proxy(
				{},
				{
					get(_, functionName: string) {
						return (
							...parameters: [
								args?: readonly unknown[],
								options?: UnionOmit<EstimateContractGasParameters, 'abi' | 'address' | 'functionName' | 'args'>
							]
						) => {
							const {args, options} = getFunctionParameters(parameters);
							const client = (publicClient ?? walletClient)!;
							return getAction(
								client,
								estimateContractGas,
								'estimateContractGas'
							)({
								abi,
								address,
								functionName,
								args,
								...options,
								account:
									(options as EstimateContractGasParameters).account ?? (walletClient as unknown as Client).account,
							} as any);
						};
					},
				}
			);
		}

	contract.address = address;
	contract.abi = abi;

	return contract as unknown as GetContractReturnType<TAbi, TClient, TAddress>;
}

/**
 * @internal exporting for testing only
 */
export function getFunctionParameters(values: [args?: readonly unknown[], options?: object]) {
	const hasArgs = values.length && Array.isArray(values[0]);
	const args = hasArgs ? values[0]! : [];
	const options = (hasArgs ? values[1] : values[0]) ?? {};
	return {args, options};
}

type GetEstimateFunction<
	Narrowable extends boolean,
	TChain extends Chain | undefined,
	TAccount extends Account | undefined,
	TAbi extends Abi | readonly unknown[],
	TFunctionName extends ContractFunctionName<TAbi, 'nonpayable' | 'payable'>,
	TArgs extends ContractFunctionArgs<TAbi, 'nonpayable' | 'payable', TFunctionName> = ContractFunctionArgs<
		TAbi,
		'nonpayable' | 'payable',
		TFunctionName
	>,
	TAbiFunction extends AbiFunction = TAbi extends Abi ? ExtractAbiFunction<TAbi, TFunctionName> : AbiFunction,
	Args = AbiParametersToPrimitiveTypes<TAbiFunction['inputs']>,
	Options = Prettify<
		UnionOmit<
			EstimateContractGasParameters<TAbi, TFunctionName, TArgs, TChain>,
			'abi' | 'address' | 'args' | 'functionName'
		>
	>,
	// For making `options` parameter required if `TAccount`
	IsOptionsRequired = IsUndefined<TAccount>
> = Narrowable extends true
	? (
			...parameters: Args extends readonly []
				? IsOptionsRequired extends true
					? [options: Options]
					: [options?: Options]
				: [args: Args, ...parameters: IsOptionsRequired extends true ? [options: Options] : [options?: Options]]
	  ) => Promise<EstimateContractGasReturnType>
	: (
			...parameters:
				| (IsOptionsRequired extends true ? [options: Options] : [options?: Options])
				| [
						args: readonly unknown[],
						...parameters: IsOptionsRequired extends true ? [options: Options] : [options?: Options]
				  ]
	  ) => Promise<EstimateContractGasReturnType>;
