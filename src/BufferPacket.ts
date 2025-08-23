import { BufferTypeSerializer } from "./BufferTypeSerializer";
import type { DiscriminatedUnion } from "./PacketList";
import { Object } from "@rbxts/jsnatives";
import {
	RemoteMode,
	IBufferPacketType,
	TypedBufferMap,
	EPacketReliability,
	BufferTypeFor,
	IDiscriminatedBufferPacket,
} from "./BufferTypes";
import { HexHelper } from "./HexHelper";

export class BufferPacketDefinition<
	Mode extends RemoteMode,
	SerializedType extends IBufferPacketType = IBufferPacketType,
> {
	public static readonly UntrimmedBufferSize = 4 * 1e6;

	protected readonly Headers: Partial<TypedBufferMap<SerializedType["Headers"]>> = {};
	protected readonly DataKeys: Partial<TypedBufferMap<SerializedType["Data"]>> = {};

	private readonly MagicString = "";

	public Reliability: EPacketReliability = EPacketReliability.Reliable;

	public SetHeaders(Headers: TypedBufferMap<SerializedType["Headers"]>): this {
		Object.assign(this.Headers, Headers);

		return this;
	}

	public AddHeader<Key extends keyof SerializedType["Headers"]>(
		Key: Key,
		Type: BufferTypeFor<SerializedType["Headers"][Key]>,
	): this {
		if (this.Headers[Key] !== undefined) {
			throw `Header "${tostring(Key)}" already exists in the packet definition.`;
		}

		this.Headers[Key] = Type as BufferTypeFor<SerializedType["Headers"][Key]>;
		return this;
	}

	public Unreliable(): this {
		this.Reliability = EPacketReliability.Unreliable;

		return this;
	}

	public SetDataKeys(DataKeys: TypedBufferMap<SerializedType["Data"]>): this {
		Object.assign(this.DataKeys, DataKeys);

		return this;
	}

	protected SerializeRecordList(
		Buffer: buffer,
		InitialOffset: number,
		Record: Partial<TypedBufferMap>,
		Data: SerializedType["Data"] | SerializedType["Headers"],
	): number {
		let Offset = InitialOffset;

		for (const [Key, Type] of pairs(Record)) {
			const ByteSize = BufferTypeSerializer.Serialize(Buffer, Offset, Data[Key], Type);

			Offset += ByteSize;
		}

		return Offset - InitialOffset;
	}

	protected DeserializeRecordList(
		Buffer: buffer,
		InitialOffset: number,
		Record: Partial<TypedBufferMap>,
		WriteTo: Record<string, unknown>,
	): number {
		let Offset = InitialOffset;

		for (const [Key, Type] of pairs(Record)) {
			const [Value, Size] = BufferTypeSerializer.Deserialize(Buffer, Offset, Type);

			if (Value === undefined) {
				throw `Value for "${Key}" is not defined in the packet.`;
			}

			WriteTo[Key] = Value;

			Offset += Size;
		}

		return Offset - InitialOffset;
	}

	public Serialize(Packet: SerializedType): buffer {
		const Buffer = buffer.create(BufferPacketDefinition.UntrimmedBufferSize);

		buffer.writestring(Buffer, 0, this.MagicString);

		let Offset = this.MagicString.size();

		// Serialize headers
		Offset += this.SerializeRecordList(Buffer, Offset, this.Headers, Packet.Headers);
		// Serialize data keys
		Offset += this.SerializeRecordList(Buffer, Offset, this.DataKeys, Packet.Data);

		// Trim the buffer to the actual size used
		const TrimmedBuffer = buffer.create(Offset);

		buffer.copy(TrimmedBuffer, 0, Buffer, 0, Offset);

		return TrimmedBuffer;
	}

	public Deserialize(Buffer: buffer): SerializedType {
		const Headers = {} as SerializedType["Headers"];
		const Data = {} as SerializedType["Data"];

		let Offset = this.MagicString.size();

		// Deserialize headers
		Offset += this.DeserializeRecordList(Buffer, Offset, this.Headers, Headers);
		// Deserialize data keys
		this.DeserializeRecordList(Buffer, Offset, this.DataKeys, Data);

		return {
			Headers,
			Data,
		} as SerializedType;
	}

	public ToHex(Buffer: buffer): string {
		return HexHelper.BufferToHex(Buffer);
	}

	public Extend<NewType extends SerializedType>(): BufferPacketDefinition<Mode, NewType> {
		const NewPacket = new BufferPacketDefinition<Mode, NewType>();

		NewPacket.SetHeaders(this.Headers as TypedBufferMap<NewType["Headers"]>);
		NewPacket.SetDataKeys(this.DataKeys as TypedBufferMap<NewType["Data"]>);

		return NewPacket;
	}

	public ToString(Packet: SerializedType): string {
		const Buffer = this.Serialize(Packet);
		return buffer.tostring(Buffer);
	}

	public FromString(Data: string): SerializedType {
		const Buffer = buffer.fromstring(Data);
		return this.Deserialize(Buffer);
	}
}

export class DiscriminatedBufferPacketDefinition<
	Mode extends RemoteMode,
	TPAKTemplate extends IDiscriminatedBufferPacket,
	TDValue = TPAKTemplate["Headers"][TPAKTemplate["DiscriminatorKey"]],
	TDKey extends keyof TPAKTemplate["Headers"] = TPAKTemplate["DiscriminatorKey"],
	THDR extends TPAKTemplate["Headers"] = TPAKTemplate["Headers"],
	TVAR extends TPAKTemplate["Variants"] = TPAKTemplate["Variants"],
	TPAK extends DiscriminatedUnion<TVAR, THDR, TDKey> = DiscriminatedUnion<TVAR, THDR, TDKey>,
> extends BufferPacketDefinition<Mode, TPAK> {
	declare protected readonly Headers: Partial<TypedBufferMap<TPAK["Headers"]>>;

	private readonly VariantSchemas = new Map<TDValue, TypedBufferMap<defined>>();

	public constructor(private readonly DiscriminatorKey: TDKey) {
		super();
	}

	public AddDiscriminatorKey(Type: BufferTypeFor<THDR[TDKey]>): this {
		const HeaderMap = this.Headers as TypedBufferMap<THDR>;

		// Narrow key to `keyof THeaders` first
		const NarrowKey = this.DiscriminatorKey as keyof THDR;

		if (HeaderMap[NarrowKey] !== undefined) {
			throw `Header "${tostring(NarrowKey)}" already exists in the packet definition.`;
		}

		// Cast `Type` to what HeaderMap expects
		HeaderMap[NarrowKey] = Type as BufferTypeFor<THDR[typeof NarrowKey]>;
		return this;
	}

	public override SetHeaders(Headers: Omit<TypedBufferMap<TPAKTemplate["Headers"]>, TDKey>): this {
		Object.assign(this.Headers, Headers);

		return this;
	}

	public AddVariant<K extends keyof TVAR>(Type: K, Schema: TypedBufferMap<TVAR[K]>): this {
		this.VariantSchemas.set(Type as unknown as TDValue, Schema);
		return this;
	}

	protected GetVariantSchema(Discriminator: TDValue): TypedBufferMap<defined> {
		const Schema = this.VariantSchemas.get(Discriminator);
		if (Schema === undefined) throw `No schema defined for discriminator value "${tostring(Discriminator)}"`;
		return Schema;
	}

	public override Serialize(Packet: TPAK): buffer {
		const Buffer = buffer.create(BufferPacketDefinition.UntrimmedBufferSize);
		let Offset = 0;

		const HeadersWithDiscriminator = {
			...Packet.Headers,
			[this.DiscriminatorKey]: Packet.Type,
		} as THDR;

		Offset += this.SerializeRecordList(Buffer, Offset, this.Headers, HeadersWithDiscriminator);
		Offset += this.SerializeRecordList(Buffer, Offset, this.GetVariantSchema(Packet.Type as TDValue), Packet.Data);

		// Trim the buffer to the actual size used
		const TrimmedBuffer = buffer.create(Offset);

		buffer.copy(TrimmedBuffer, 0, Buffer, 0, Offset);

		return TrimmedBuffer;
	}

	public override Deserialize(Buffer: buffer): TPAK {
		const Headers = {} as THDR;
		let Offset = 0;

		Offset += this.DeserializeRecordList(Buffer, Offset, this.Headers, Headers);

		const Discriminator = Headers[this.DiscriminatorKey] as TDValue;
		const VariantSchema = this.GetVariantSchema(Discriminator);
		const Data = {} as TVAR[keyof TDValue];

		this.DeserializeRecordList(Buffer, Offset, VariantSchema, Data);

		const HeadersWithoutDiscriminator = {
			...Headers,
			[this.DiscriminatorKey]: undefined,
		} as THDR;

		return {
			Headers: HeadersWithoutDiscriminator,
			Data,
			Type: Discriminator,
		} as never as TPAK;
	}

	public override ToString(Packet: TPAK): string {
		const Buffer = this.Serialize(Packet);
		return buffer.tostring(Buffer);
	}

	public override FromString(Data: string): TPAK {
		const Buffer = buffer.fromstring(Data);
		return this.Deserialize(Buffer);
	}
}
