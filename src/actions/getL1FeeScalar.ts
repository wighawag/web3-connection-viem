import {
	Address,
	Chain,
	GetChainParameter,
	PrepareTransactionRequestErrorType,
	PublicClient,
	ReadContractErrorType,
	Transport,
} from 'viem';
import {ErrorType} from 'viem/errors/utils';
import {HexToNumberErrorType, RequestErrorType, getChainContractAddress} from 'viem/utils';

import {chainConfig} from 'viem/op-stack';
const contracts = chainConfig.contracts;

const gasPriceOracleAbi = [
	{
		inputs: [],
		name: 'scalar',
		outputs: [{internalType: 'uint256', name: '', type: 'uint256'}],
		stateMutability: 'view',
		type: 'function',
	},
] as const;

export type GetL1FeeScalarParameters<
	TChain extends Chain | undefined = Chain | undefined,
	TChainOverride extends Chain | undefined = undefined
> = GetChainParameter<TChain, TChainOverride> & {
	/** Gas price oracle address. */
	gasPriceOracleAddress?: Address;
};

export type GetL1FeeScalarReturnType = bigint;

export type GetL1FeeScalarErrorType =
	| RequestErrorType
	| PrepareTransactionRequestErrorType
	| HexToNumberErrorType
	| ReadContractErrorType
	| ErrorType;

/**
 * get the L1 fee scalar
 *
 * @param client - Client to use
 * @param parameters - {@link GetL1FeeScalarParameters}
 * @returns The FeeScalar (in wei). {@link GetL1FeeScalarReturnType}
 *
 * @example
 * import { createPublicClient, http, parseEther } from 'viem'
 * import { optimism } from 'viem/chains'
 * import { getL1FeeScalar } from 'viem/chains/optimism'
 *
 * const client = createPublicClient({
 *   chain: optimism,
 *   transport: http(),
 * })
 * const l1FeeScalar = await getL1FeeScalar(client)
 */
export async function getL1FeeScalar<
	TChain extends Chain | undefined,
	TChainOverride extends Chain | undefined = undefined
>(
	client: PublicClient<Transport, TChain>,
	args?: GetL1FeeScalarParameters<TChain, TChainOverride>
): Promise<GetL1FeeScalarReturnType> {
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
		functionName: 'scalar',
	});
}
