/* eslint-disable @typescript-eslint/naming-convention */

import { Obfuscator } from "./Obfuscator";
import { HttpService } from "@rbxts/services";
import { BufferHelper } from "./BufferHelper";
import { EBufferType, BufferTypeForArray, IBufferTypeMap } from ".";
import { t } from "@rbxts/t";
import zlib from "@rbxts/zlib";
import { HexHelper } from "./HexHelper";

export abstract class BufferTypeSerializer {
	private static readonly SurelyNoCheatersWillSeeThis = "SkibidiToilet";

	private static CompressionConfig: zlib.config = {
		level: 1,
		strategy: "dynamic",
	};

	private static StripNullCharacters(StringValue: string): string {
		return StringValue.gsub("\0", "")[0];
	}

	public static Serialize(
		Buffer: buffer,
		Offset: number,
		Value: unknown,
		Type: EBufferType | BufferTypeForArray<EBufferType>,
	): number {
		if (t.array(t.any)(Type) && t.array(t.any)(Value)) {
			const ArrayType = Type[0];

			const ArraySize = Value.size();

			buffer.writeu16(Buffer, Offset, ArraySize);

			Offset += 2;

			Value.forEach((Item) => {
				Offset += this.Serialize(Buffer, Offset, Item, ArrayType);
			});

			return Offset;
		}

		switch (Type) {
			case EBufferType.Boolean:
				if (!t.boolean(Value)) {
					throw `Expected boolean for EBufferType.Boolean, got ${typeOf(Value)}`;
				}

				buffer.writeu8(Buffer, Offset, Value === true ? 1 : 0);
				return 1;
			case EBufferType.UInt8:
				if (!t.integer(Value) || !t.numberConstrained(0, 0xff)(Value)) {
					throw `Expected number in range [0, 255] for EBufferType.UInt8, got ${Value}`;
				}

				buffer.writeu8(Buffer, Offset, Value);
				return 1;
			case EBufferType.UInt16:
				if (!t.integer(Value) || !t.numberConstrained(0, 0xffff)(Value)) {
					throw `Expected number in range [0, 65,535] for EBufferType.UInt16, got ${Value}`;
				}

				buffer.writeu16(Buffer, Offset, Value);
				return 2;
			case EBufferType.UInt24: {
				if (!t.integer(Value) || !t.numberConstrained(0, 0xffffff)(Value)) {
					throw `Expected number in range [0, 16,777,215] for EBufferType.UInt24, got ${Value}`;
				}

				BufferHelper.writeu24(Buffer, Offset, Value);
				return 3;
			}
			case EBufferType.UInt32:
				if (!t.integer(Value) || !t.numberConstrained(0, 0xffffffff)(Value)) {
					throw `Expected number in range [0, 4,294,967,295] for EBufferType.UInt32, got ${Value}`;
				}

				buffer.writeu32(Buffer, Offset, Value);
				return 4;
			case EBufferType.Int8:
				if (!t.integer(Value) || !t.numberConstrained(-128, 127)(Value)) {
					throw `Expected number in range [-128, 127] for EBufferType.Int8, got ${Value}`;
				}

				buffer.writei8(Buffer, Offset, Value);
				return 1;
			case EBufferType.Int16:
				if (!t.integer(Value) || !t.numberConstrained(-32768, 32767)(Value)) {
					throw `Expected number in range [-32,768, 32,767] for EBufferType.Int16, got ${Value}`;
				}

				buffer.writei16(Buffer, Offset, Value);
				return 2;
			case EBufferType.Int32:
				if (!t.integer(Value) || !t.numberConstrained(-2147483648, 2147483647)(Value)) {
					throw `Expected number in range [-2,147,483,648, 2,147,483,647] for EBufferType.Int32, got ${Value}`;
				}

				buffer.writei32(Buffer, Offset, Value);
				return 4;
			case EBufferType.Float32:
				if (!t.number(Value)) {
					throw `Expected number for EBufferType.Float32, got ${Value}`;
				}

				buffer.writef32(Buffer, Offset, Value);
				return 4;
			case EBufferType.Float64:
				if (!t.number(Value)) {
					throw `Expected number for EBufferType.Float64, got ${Value}`;
				}

				buffer.writef64(Buffer, Offset, Value);
				return 8;
			case EBufferType.Vector2: {
				if (!t.Vector2(Value)) {
					throw `Expected Vector2 for EBufferType.Vector2, got ${typeOf(Value)}`;
				}

				buffer.writef32(Buffer, Offset, Value.X);
				buffer.writef32(Buffer, Offset + 4, Value.Y);
				return 8;
			}
			case EBufferType.Vector2Int16: {
				if (!t.Vector2int16(Value)) {
					throw `Expected Vector2int16 for EBufferType.Vector2Int16, got ${typeOf(Value)}`;
				}

				buffer.writei16(Buffer, Offset, math.floor(Value.X));
				buffer.writei16(Buffer, Offset + 2, math.floor(Value.Y));
				return 4;
			}
			case EBufferType.Vector3: {
				if (!t.Vector3(Value)) {
					throw `Expected Vector3 for EBufferType.Vector3, got ${typeOf(Value)}`;
				}

				buffer.writef32(Buffer, Offset, Value.X);
				buffer.writef32(Buffer, Offset + 4, Value.Y);
				buffer.writef32(Buffer, Offset + 8, Value.Z);
				return 12;
			}
			case EBufferType.Vector3Int16: {
				if (!t.Vector3int16(Value)) {
					throw `Expected Vector3int16 for EBufferType.Vector3Int16, got ${typeOf(Value)}`;
				}

				const Vector = Value as Vector3int16;
				buffer.writei16(Buffer, Offset, math.floor(Vector.X));
				buffer.writei16(Buffer, Offset + 2, math.floor(Vector.Y));
				buffer.writei16(Buffer, Offset + 4, math.floor(Vector.Z));
				return 6;
			}
			case EBufferType.Color3: {
				if (!t.Color3(Value)) {
					throw `Expected Color3 for EBufferType.Color3, got ${typeOf(Value)}`;
				}

				buffer.writeu8(Buffer, Offset, math.floor(Value.R * 255));
				buffer.writeu8(Buffer, Offset + 1, math.floor(Value.G * 255));
				buffer.writeu8(Buffer, Offset + 2, math.floor(Value.B * 255));
				return 3;
			}
			case EBufferType.ObjectId: {
				if (!t.string(Value)) {
					throw `Expected string for EBufferType.ObjectId, got ${typeOf(Value)}`;
				}

				if (Value.size() !== 24) {
					throw `Expected 24 character hex string for EBufferType.ObjectId, got ${Value}`;
				}

				const Bytes = HexHelper.HexToBinary(Value);

				buffer.writestring(Buffer, Offset, Bytes);

				return 12;
			}
			case EBufferType.Byte: {
				if (!t.string(Value)) {
					throw `Expected string for EBufferType.Byte, got ${typeOf(Value)}`;
				}

				if (Value.size() !== 1) {
					throw `Expected single byte string for EBufferType.Byte, got ${Value}`;
				}

				buffer.writestring(Buffer, Offset, Value);
				return 1;
			}
			case EBufferType.String8: {
				if (!t.string(Value)) {
					throw `Expected string for EBufferType.String8, got ${typeOf(Value)}`;
				}

				if (Value.size() > 8) {
					throw `String exceeds 8 bytes for EBufferType.String8, got ${Value}`;
				}

				buffer.writestring(Buffer, Offset, Value);
				return 8;
			}
			case EBufferType.String16: {
				if (!t.string(Value)) {
					throw `Expected string for EBufferType.String16, got ${typeOf(Value)}`;
				}

				if (Value.size() > 16) {
					throw `String exceeds 16 bytes for EBufferType.String16, got ${Value}`;
				}

				buffer.writestring(Buffer, Offset, Value);
				return 16;
			}
			case EBufferType.String32: {
				if (!t.string(Value)) {
					throw `Expected string for EBufferType.String32, got ${typeOf(Value)}`;
				}

				if (Value.size() > 32) {
					throw `String exceeds 32 bytes for EBufferType.String32, got ${Value}`;
				}

				buffer.writestring(Buffer, Offset, Value);
				return 32;
			}
			case EBufferType.String64: {
				if (!t.string(Value)) {
					throw `Expected string for EBufferType.String64, got ${typeOf(Value)}`;
				}

				if (Value.size() > 64) {
					throw `String exceeds 64 bytes for EBufferType.String64, got ${Value}`;
				}

				buffer.writestring(Buffer, Offset, Value);
				return 64;
			}
			case EBufferType.DynamicString8: {
				if (!t.string(Value)) {
					throw `Expected string for EBufferType.DynamicString, got ${typeOf(Value)}`;
				}

				buffer.writeu8(Buffer, Offset, Value.size());
				buffer.writestring(Buffer, Offset + 1, Value);

				return 1 + Value.size();
			}
			case EBufferType.JSONObject: {
				if (!t.table(Value)) {
					throw `Expected table for EBufferType.JSONObject, got ${typeOf(Value)}`;
				}

				const JSONEncoded = HttpService.JSONEncode(Value);

				const Obfuscated = Obfuscator.XorString(JSONEncoded, this.SurelyNoCheatersWillSeeThis);
				const Compressed = zlib.Zlib.Compress(Obfuscated, this.CompressionConfig);

				BufferHelper.writeu24(Buffer, Offset, Compressed.size());
				buffer.writestring(Buffer, Offset + 3, Compressed);

				return 3 + Compressed.size();
			}
			case EBufferType.ZLibCompressedString: {
				if (!t.string(Value)) {
					throw `Expected string for EBufferType.ZLibCompressedString, got ${typeOf(Value)}`;
				}

				const Obfuscated = Obfuscator.XorString(Value, this.SurelyNoCheatersWillSeeThis);
				const Compressed = zlib.Zlib.Compress(Obfuscated, this.CompressionConfig);

				BufferHelper.writeu24(Buffer, Offset, Compressed.size());
				buffer.writestring(Buffer, Offset + 3, Compressed);

				return 3 + Compressed.size();
			}
			case EBufferType.LongString: {
				if (!t.string(Value)) {
					throw `Expected string for EBufferType.DynamicString, got ${typeOf(Value)}`;
				}

				const Obfuscated = Obfuscator.XorString(Value, this.SurelyNoCheatersWillSeeThis);

				BufferHelper.writeu24(Buffer, Offset, Obfuscated.size());
				buffer.writestring(Buffer, Offset + 3, Obfuscated);

				return 3 + Obfuscated.size();
			}
		}

		throw `Unknown buffer type: ${Type}`;
	}

	public static Deserialize<T extends EBufferType>(
		Buffer: buffer,
		Offset: number,
		Type: T | BufferTypeForArray<T>,
	): [IBufferTypeMap[T], number] {
		if (t.array(t.any)(Type)) {
			const ArrayType = Type[0] as EBufferType;
			const ArraySize = buffer.readu16(Buffer, Offset);

			Offset += 2;

			const Result: Array<IBufferTypeMap[T]> = [];

			for (let Index = 0; Index < ArraySize; Index++) {
				const [Value, Size] = this.Deserialize(Buffer, Offset, ArrayType);
				Result.push(Value as IBufferTypeMap[T]);
				Offset += Size;
			}

			return [Result as IBufferTypeMap[T], Offset - (Offset - 2)];
		}

		switch (Type) {
			case EBufferType.Boolean: {
				const Raw = buffer.readu8(Buffer, Offset);
				return [(Raw !== 0) as IBufferTypeMap[T], 1];
			}
			case EBufferType.UInt8:
				return [buffer.readu8(Buffer, Offset) as IBufferTypeMap[T], 1];
			case EBufferType.UInt16:
				return [buffer.readu16(Buffer, Offset) as IBufferTypeMap[T], 2];
			case EBufferType.UInt24: {
				const Value = BufferHelper.readu24(Buffer, Offset);
				return [Value as IBufferTypeMap[T], 3];
			}
			case EBufferType.UInt32:
				return [buffer.readu32(Buffer, Offset) as IBufferTypeMap[T], 4];
			case EBufferType.Int8:
				return [buffer.readi8(Buffer, Offset) as IBufferTypeMap[T], 1];
			case EBufferType.Int16:
				return [buffer.readi16(Buffer, Offset) as IBufferTypeMap[T], 2];
			case EBufferType.Int32:
				return [buffer.readi32(Buffer, Offset) as IBufferTypeMap[T], 4];
			case EBufferType.Float32:
				return [buffer.readf32(Buffer, Offset) as IBufferTypeMap[T], 4];
			case EBufferType.Float64:
				return [buffer.readf64(Buffer, Offset) as IBufferTypeMap[T], 8];
			case EBufferType.Vector2: {
				const X = buffer.readf32(Buffer, Offset);
				const Y = buffer.readf32(Buffer, Offset + 4);

				return [new Vector2(X, Y) as IBufferTypeMap[T], 8];
			}
			case EBufferType.Vector2Int16: {
				const X = buffer.readi16(Buffer, Offset);
				const Y = buffer.readi16(Buffer, Offset + 2);

				return [new Vector2int16(X, Y) as IBufferTypeMap[T], 4];
			}
			case EBufferType.Vector3: {
				const X = buffer.readf32(Buffer, Offset);
				const Y = buffer.readf32(Buffer, Offset + 4);
				const Z = buffer.readf32(Buffer, Offset + 8);

				return [new Vector3(X, Y, Z) as IBufferTypeMap[T], 12];
			}
			case EBufferType.Vector3Int16: {
				const X = buffer.readi16(Buffer, Offset);
				const Y = buffer.readi16(Buffer, Offset + 2);
				const Z = buffer.readi16(Buffer, Offset + 4);

				return [new Vector3int16(X, Y, Z) as IBufferTypeMap[T], 6];
			}
			case EBufferType.Color3: {
				const R = buffer.readu8(Buffer, Offset);
				const G = buffer.readu8(Buffer, Offset + 1);
				const B = buffer.readu8(Buffer, Offset + 2);

				return [Color3.fromRGB(R, G, B) as IBufferTypeMap[T], 3];
			}
			case EBufferType.ObjectId: {
				const StringValue = buffer.readstring(Buffer, Offset, 12);

				return [HexHelper.BinaryToHex(StringValue) as IBufferTypeMap[T], 12];
			}
			case EBufferType.Byte: {
				const StringValue = buffer.readstring(Buffer, Offset, 1);

				return [StringValue as IBufferTypeMap[T], 1];
			}
			case EBufferType.String8: {
				const Plain = buffer.readstring(Buffer, Offset, 8);

				return [BufferTypeSerializer.StripNullCharacters(Plain) as IBufferTypeMap[T], 8];
			}
			case EBufferType.String16: {
				const Plain = buffer.readstring(Buffer, Offset, 16);

				return [BufferTypeSerializer.StripNullCharacters(Plain) as IBufferTypeMap[T], 16];
			}
			case EBufferType.String32: {
				const Plain = buffer.readstring(Buffer, Offset, 32);

				return [BufferTypeSerializer.StripNullCharacters(Plain) as IBufferTypeMap[T], 32];
			}
			case EBufferType.String64: {
				const Plain = buffer.readstring(Buffer, Offset, 64);

				return [BufferTypeSerializer.StripNullCharacters(Plain) as IBufferTypeMap[T], 64];
			}
			case EBufferType.DynamicString8: {
				const Size = buffer.readu8(Buffer, Offset);
				const Plain = buffer.readstring(Buffer, Offset + 1, Size);

				return [Plain as IBufferTypeMap[T], 1 + Size];
			}
			case EBufferType.JSONObject: {
				const Size = BufferHelper.readu24(Buffer, Offset);
				const Compressed = buffer.readstring(Buffer, Offset + 3, Size);
				const Obfuscated = zlib.Zlib.Decompress(Compressed) as string;
				const Plain = Obfuscator.XorString(Obfuscated, this.SurelyNoCheatersWillSeeThis);
				const Parsed = HttpService.JSONDecode(Plain);

				return [Parsed as IBufferTypeMap[T], 3 + Size];
			}
			case EBufferType.ZLibCompressedString: {
				const Size = BufferHelper.readu24(Buffer, Offset);
				const Compressed = buffer.readstring(Buffer, Offset + 3, Size);
				const Obfuscated = zlib.Zlib.Decompress(Compressed) as string;
				const Plain = Obfuscator.XorString(Obfuscated, this.SurelyNoCheatersWillSeeThis);

				return [Plain as IBufferTypeMap[T], 3 + Size];
			}
			case EBufferType.LongString: {
				const Size = BufferHelper.readu24(Buffer, Offset);
				const Obfuscated = buffer.readstring(Buffer, Offset + 3, Size);
				const Plain = Obfuscator.XorString(Obfuscated, this.SurelyNoCheatersWillSeeThis);

				return [Plain as IBufferTypeMap[T], 3 + Size];
			}
		}

		throw `Unknown buffer type: ${Type}`;
	}
}
