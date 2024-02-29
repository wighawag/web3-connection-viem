import {Chain, Client, PublicClient, Transport} from 'viem';
import {GetL1BaseFeeParameters, GetL1BaseFeeReturnType, getL1BaseFee} from './getL1BaseFee';
import {GetL1FeeScalarParameters, GetL1FeeScalarReturnType, getL1FeeScalar} from './getL1FeeScalar';

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

	/**
	 * Get the L1 fee scalar
	 *
	 * @param client - Client to use
	 * @param parameters - {@link GetL1FeeScalarParameters}
	 * @returns The fee (in wei). {@link GetL1FeeScalarReturnType}
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
	 * const l1FeeScalar = await client.getL1FeeScalar()
	 */
	getL1FeeScalar: <chainOverride extends Chain | undefined = undefined>(
		parameters?: GetL1FeeScalarParameters<chain, chainOverride>
	) => Promise<GetL1FeeScalarReturnType>;
};

// : <
// 	TTransport extends Transport,
// 	TChain extends Chain | undefined = Chain | undefined
// >() => (client: PublicClient<TTransport, TChain>) => ExtraPublicActions<TChain>
export function extraActions() {
	return <TTransport extends Transport, TChain extends Chain | undefined = Chain | undefined>(
		client: Client<TTransport, TChain>
	): ExtraPublicActions<TChain> => {
		return {
			getL1BaseFee: (args) => getL1BaseFee(client as PublicClient<TTransport, TChain>, args),
			getL1FeeScalar: (args) => getL1FeeScalar(client as PublicClient<TTransport, TChain>, args),
		};
	};
}
