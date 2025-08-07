export abstract class HexHelper {
	public static BinaryToHex(String: string, Seperator: string = ""): string {
		const HexParts = new Array<string>();

		for (let Index = 1; Index < String.size() + 1; Index++) {
			const CharCode = String.byte(Index)[0];
			const HexPart = "%02x".format(CharCode);
			HexParts.push(HexPart);
		}

		return HexParts.join(Seperator);
	}

	public static BufferToHex(Buffer: buffer, Seperator: string = ""): string {
		return HexHelper.BinaryToHex(buffer.tostring(Buffer), Seperator);
	}

	public static HexToBinary(Hex: string): string {
		const CleanHex = string.gsub(Hex, "%s", "")[0];
		assert(CleanHex.size() % 2 === 0, `Hex string must have an even number of characters: ${CleanHex}`);

		const Bytes = new Array<number>();

		for (let I = 0; I < CleanHex.size(); I += 2) {
			const HexByte = CleanHex.sub(I + 1, I + 2);
			const Byte = tonumber(HexByte, 16);
			assert(Byte !== undefined, `Invalid hex byte: ${HexByte} in string ${CleanHex}`);
			Bytes.push(Byte);
		}

		return string.char(...Bytes);
	}
}
