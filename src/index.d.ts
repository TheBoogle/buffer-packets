declare namespace BufferPackets {
	/**
	 * Enumeration of buffer types with their corresponding byte sizes.
	 * @enum
	 */
	export const enum EBufferType {
		/** Boolean (1 byte). Represents true or false */
		Boolean,
		/** Unsigned 8-bit integer (1 byte). Max value: 255 */
		UInt8,
		/** Unsigned 16-bit integer (2 bytes). Max value: 65,535 */
		UInt16,
		/** Unsigned 24-bit integer (3 bytes). Max value: 16,777,215 */
		UInt24,
		/** Unsigned 32-bit integer (4 bytes). Max value: 4,294,967,295 */
		UInt32,
		/** Signed 8-bit integer (1 byte). Range: -128 to 127 */
		Int8,
		/** Signed 16-bit integer (2 bytes). Range: -32,768 to 32,767 */
		Int16,
		/** Signed 32-bit integer (4 bytes). Range: -2,147,483,648 to 2,147,483,647 */
		Int32,
		/** 32-bit floating point number (4 bytes). Max value: ~3.4e38 */
		Float32,
		/** 64-bit floating point number (8 bytes). Max value: ~1.8e308 */
		Float64,
		/** A single byte (1 byte). Represents a single character or small value */
		Byte,
		/** String with maximum length of 8 characters (8 bytes). Max size: 8 chars */
		String8,
		/** String with maximum length of 16 characters (16 bytes). Max size: 16 chars */
		String16,
		/** String with maximum length of 32 characters (32 bytes). Max size: 32 chars */
		String32,
		/** String with maximum length of 64 characters (64 bytes). Max size: 64 chars */
		String64,
		/** Short dynamic string (1 byte for length + variable length). Max size: 255 bytes */
		DynamicString8,
		/** Long string (3 bytes for length + variable length). Max size: 16,777,215 bytes (16MB). */
		LongString,
		/** ZLib compressed string (3 bytes for length + variable length). Max size: 16,777,215 bytes (16MB). Use `EBufferType.DynamicString` unless you absolutely need this. This uses more CPU cycles. */
		ZLibCompressedString,
		/** JSON object (3 bytes for length + variable length). Max size: 16,777,215 bytes (16MB). Converts the object into a JSON string, then obfuscates and compresses it. */
		JSONObject,
		/** Object ID (12 bytes, expects 24 character hex string). Max size: 12 bytes */
		ObjectId,
		/** 2D vector (2 x 4 bytes = 8 bytes). Each component: Float32, max ~3.4e38 */
		Vector2,
		/** 2D vector with 16-bit integers (2 x 2 bytes = 4 bytes). Each component: Int16, range -32,768 to 32,767 */
		Vector2Int16,
		/** 3D vector (3 x 4 bytes = 12 bytes). Each component: Float32, max ~3.4e38 */
		Vector3,
		/** 3D vector with 16-bit integers (3 x 2 bytes = 6 bytes). Each component: Int16, range -32,768 to 32,767 */
		Vector3Int16,
		/** RGB color (3 x 1 byte = 3 bytes). Each component: UInt8, range 0-255 */
		Color3,
	}

	export const enum EPacketReliability {
		Unreliable,
		Reliable,
	}

	interface IBufferTypeMap {
		[EBufferType.Boolean]: boolean;
		[EBufferType.UInt8]: number;
		[EBufferType.UInt16]: number;
		[EBufferType.UInt24]: number;
		[EBufferType.UInt32]: number;
		[EBufferType.Int8]: number;
		[EBufferType.Int16]: number;
		[EBufferType.Int32]: number;
		[EBufferType.Float32]: number;
		[EBufferType.Float64]: number;
		[EBufferType.Byte]: string;
		[EBufferType.String8]: string;
		[EBufferType.String16]: string;
		[EBufferType.String32]: string;
		[EBufferType.String64]: string;
		[EBufferType.JSONObject]: object;
		[EBufferType.DynamicString8]: string;
		[EBufferType.LongString]: string;
		[EBufferType.ZLibCompressedString]: string;
		[EBufferType.ObjectId]: string;
		[EBufferType.Vector2]: Vector2;
		[EBufferType.Vector2Int16]: Vector2int16;
		[EBufferType.Vector3]: Vector3;
		[EBufferType.Vector3Int16]: Vector3int16;
		[EBufferType.Color3]: Color3;
	}

	type BufferTypeFor<T> =
		T extends Array<infer U>
			? Array<
					{
						[K in keyof IBufferTypeMap]: U extends IBufferTypeMap[K] ? K : never;
					}[keyof IBufferTypeMap]
				>
			: {
					[K in keyof IBufferTypeMap]: T extends IBufferTypeMap[K] ? K : never;
				}[keyof IBufferTypeMap];

	type BufferTypeForArray<T> = Array<BufferTypeFor<T>>;

	type TypedBufferMap<T extends Record<string, unknown> = Record<string, unknown>> = {
		[K in keyof T]: BufferTypeFor<T[K]> | BufferTypeForArray<T[K]>;
	};

	/**
	 * This remote will be processed by the server and is invoked by the client.
	 */
	export interface Server {
		readonly __brand: unique symbol;
	}

	/**
	 * This remote will be processed by the client and is invoked by the server.
	 */
	export interface Client {
		readonly __brand: unique symbol;
	}

	export type RemoteMode = Server | Client;

	export interface IBufferPacketType {
		Headers: {
			[key: string]: unknown;
		};
		Data: {
			[key: string]: unknown;
		};
	}

	export interface IDiscriminatedBufferPacket<HDR = Record<string, unknown>> {
		Headers: HDR;
		DiscriminatorKey: keyof HDR;
		Variants: Record<string | number | symbol, Record<string, unknown>>;
	}

	interface IBasePacket<T extends IBufferPacketType> {
		Fire(Player: Player | T, Packet: T): void;

		FireAll(Packet: T): void;

		FireAllExcept(Except: Player, Packet: T): void;

		OnPacketReceived(Callback: (PlayerOrPacket: Player | T, Packet?: T) => void): RBXScriptConnection;
	}

	/** Server to client */
	interface IClientPacket<T extends IBufferPacketType> extends IBasePacket<T> {
		/** @server */
		Fire(Player: Player, Packet: T): void;

		/** @server */
		FireAll(Packet: T): void;

		/** @server */
		FireAllExcept(Except: Player, Packet: T): void;

		/** @client */
		OnPacketReceived(Callback: (Packet: T) => void): RBXScriptConnection;
	}

	/** Client to server */
	interface IServerPacket<T extends IBufferPacketType> extends IBasePacket<T> {
		/** @client */
		Fire(Packet: T): void;

		/** @hidden */
		FireAll(Packet: T): void;

		/** @hidden */
		FireAllExcept(Except: Player, Packet: T): void;

		/** @server */
		OnPacketReceived(Callback: (Player: Player, Packet: T) => void): RBXScriptConnection;
	}

	type Exact<T, Shape extends T> = Exclude<keyof Shape, keyof T> extends never ? Shape : never;
}

export = BufferPackets;
export as namespace BufferPackets;
