import {
	IBufferPacketType,
	RemoteMode,
	EPacketReliability,
	Client,
	IClientPacket,
	Server,
	IServerPacket,
	IDiscriminatedBufferPacket,
} from "./BufferTypes";
import type { BufferPacketDefinition, DiscriminatedBufferPacketDefinition } from "./BufferPacket";
import { PacketRuntime } from "./BufferPacketRemote";
import { Object } from "@rbxts/jsnatives";

// ----- Packet Type Logic -----

export type PacketType<
	SerializedType extends IBufferPacketType,
	Mode extends RemoteMode,
	Reliability extends EPacketReliability = EPacketReliability.Reliable,
> = Mode extends Client
	? Reliability extends EPacketReliability.Reliable
		? IClientPacket<SerializedType>
		: IClientPacket<SerializedType>
	: Mode extends Server
		? Reliability extends EPacketReliability.Reliable
			? IServerPacket<SerializedType>
			: IServerPacket<SerializedType>
		: never;

export type GenericPacketDefinition<
	Mode extends RemoteMode = RemoteMode,
	SerializedType extends IBufferPacketType = IBufferPacketType,
> =
	| BufferPacketDefinition<Mode, SerializedType>
	| DiscriminatedBufferPacketDefinition<Mode, IDiscriminatedBufferPacket, number>;

export type DiscriminatedUnion<
	TVariants extends Record<string | number | symbol, Record<string, unknown>>,
	THeaders extends Record<string, unknown>,
	TKey extends keyof THeaders,
> = {
	[K in keyof TVariants]: {
		Type: K;
		Headers: Omit<THeaders, TKey>;
		Data: TVariants[K];
	};
}[keyof TVariants];

// ----- Recursive Packet Schema Type -----

// This prevents the TS2456 circular type reference
export type RawPacketLeaf = GenericPacketDefinition<RemoteMode, IBufferPacketType>;

export type RawPacketNamespace = {
	[Key: string]: RawPacketLeaf | RawPacketNamespace;
};

export type ProducedPackets<N extends RawPacketNamespace> = {
	[K in keyof N]: N[K] extends GenericPacketDefinition<infer Mode, infer SerializedType>
		? PacketType<SerializedType, Mode>
		: N[K] extends RawPacketNamespace
			? ProducedPackets<N[K]>
			: never;
};

export type PacketNamespace = ProducedPackets<RawPacketNamespace>;

export function IsPacketDefinition(Value: object): Value is GenericPacketDefinition {
	return typeOf(Value) === "table" && Value !== undefined && "Headers" in Value;
}

// ----- Public API -----

export function CreatePackets<T extends RawPacketNamespace>(Value: T, Prefix: string = ""): ProducedPackets<T> {
	const Packets: Partial<Record<keyof T, unknown>> = {};

	for (const [Key, Packet] of Object.entries(Value)) {
		const FullName = Prefix === "" ? Key : `${Prefix}.${tostring(Key)}`;

		if (IsPacketDefinition(Packet)) {
			Packets[Key] = new PacketRuntime(tostring(FullName), Packet);
		} else if (typeOf(Packet) === "table") {
			Packets[Key] = CreatePackets(Packet as RawPacketNamespace, tostring(FullName));
		} else {
			throw `Invalid packet definition for ${tostring(Key)}: ${Packet}`;
		}
	}

	return Packets as ProducedPackets<T>;
}
