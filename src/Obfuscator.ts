export abstract class Obfuscator {
	public static XorString(Data: string, Key: string): string {
		const Bytes = new Array<number>();
		const KeyLength = Key.size();

		for (let I = 1; I <= Data.size(); I++) {
			const DataByte = string.byte(Data, I)[0];
			const KeyByte = string.byte(Key, ((I - 1) % KeyLength) + 1)[0];
			Bytes.push(DataByte ^ KeyByte);
		}

		let Output = "";

		for (const Byte of Bytes) {
			Output += string.char(Byte);
		}

		return Output;
	}
}
