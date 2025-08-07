/* eslint-disable @typescript-eslint/naming-convention */

export abstract class BufferHelper {
	public static writeu24(Buffer: buffer, offset: number, value: number): void {
		buffer.writeu8(Buffer, offset, (value >> 16) & 0xff);
		buffer.writeu8(Buffer, offset + 1, (value >> 8) & 0xff);
		buffer.writeu8(Buffer, offset + 2, value & 0xff);
	}

	public static readu24(Buffer: buffer, offset: number): number {
		const ByteStart = buffer.readu8(Buffer, offset);
		const ByteMiddle = buffer.readu8(Buffer, offset + 1);
		const ByteEnd = buffer.readu8(Buffer, offset + 2);

		return (ByteStart << 16) | (ByteMiddle << 8) | ByteEnd;
	}
}
