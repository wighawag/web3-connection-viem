import {
	Address,
	Chain,
	Client,
	GetChainParameter,
	PrepareTransactionRequestErrorType,
	PublicClient,
	ReadContractErrorType,
	Transport,
} from 'viem';
import {ErrorType} from 'viem/errors/utils';
import {HexToNumberErrorType, RequestErrorType, getChainContractAddress} from 'viem/utils';

import {chainConfig} from 'viem/op-stack';
// import {ContractFunctionArgs} from 'viem';

const contracts = chainConfig.contracts;

const gasPriceOracleAbi = [
	{
		inputs: [],
		name: 'l1BaseFee',
		outputs: [{internalType: 'uint256', name: '', type: 'uint256'}],
		stateMutability: 'view',
		type: 'function',
	},
] as const;

export type GetL1BaseFeeParameters<
	TChain extends Chain | undefined = Chain | undefined,
	TChainOverride extends Chain | undefined = undefined
> = GetChainParameter<TChain, TChainOverride> & {
	/** Gas price oracle address. */
	gasPriceOracleAddress?: Address;
};

export type GetL1BaseFeeReturnType = bigint;

export type GetL1BaseFeeErrorType =
	| RequestErrorType
	| PrepareTransactionRequestErrorType
	| HexToNumberErrorType
	| ReadContractErrorType
	| ErrorType;

/**
 * get the L1 base fee
 *
 * @param client - Client to use
 * @param parameters - {@link GetL1BaseFeeParameters}
 * @returns The basefee (in wei). {@link GetL1BaseFeeReturnType}
 *
 * @example
 * import { createPublicClient, http, parseEther } from 'viem'
 * import { optimism } from 'viem/chains'
 * import { getL1BaseFee } from 'viem/chains/optimism'
 *
 * const client = createPublicClient({
 *   chain: optimism,
 *   transport: http(),
 * })
 * const l1BaseFee = await getL1BaseFee(client)
 */
export async function getL1BaseFee<
	TChain extends Chain | undefined,
	TChainOverride extends Chain | undefined = undefined
>(
	client: PublicClient<Transport, TChain>,
	args?: GetL1BaseFeeParameters<TChain, TChainOverride>
): Promise<GetL1BaseFeeReturnType> {
	const {chain = client.chain, gasPriceOracleAddress: gasPriceOracleAddress_} = args || {};

	const gasPriceOracleAddress = (() => {
		if (gasPriceOracleAddress_) return gasPriceOracleAddress_;
		if (chain)
			return getChainContractAddress({
				chain,
				contract: 'gasPriceOracle',
			});
		return contracts.gasPriceOracle.address;
	})();

	return client.readContract({
		abi: gasPriceOracleAbi,
		address: gasPriceOracleAddress,
		functionName: 'l1BaseFee',
	});
}

export type ExtraPublicActions<chain extends Chain | undefined = Chain | undefined> = {
	/**
	 * Get the L1 basefee
	 *
	 * @param client - Client to use
	 * @param parameters - {@link GetL1BaseFeeParameters}
	 * @returns The fee (in wei). {@link GetL1BaseFeeReturnType}
	 *
	 * @example
	 * import { createPublicClient, http, parseEther } from 'viem'
	 * import { optimism } from 'viem/chains'
	 * import { publicActionsL2 } from 'viem/op-stack'
	 *
	 * const client = createPublicClient({
	 *   chain: optimism,
	 *   transport: http(),
	 * }).extend(publicActionsL2())
	 *
	 * const l1BaseFee = await client.getL1BaseFee()
	 */
	getL1BaseFee: <chainOverride extends Chain | undefined = undefined>(
		parameters?: GetL1BaseFeeParameters<chain, chainOverride>
	) => Promise<GetL1BaseFeeReturnType>;
};
