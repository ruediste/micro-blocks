import { off } from "process";

interface FieldMapper<T> {
    fromBinary(buffer: DataView, offset: number): T;
    toBinary(value: T, buffer: DataView, offset: number): void;
    size: number
}

export default class BinaryMessageMapper<T>{
    private readonly fieldMappers: { key: string, mapper: FieldMapper<any> }[] = [];

    uint16<K extends string>(key: K): BinaryMessageMapper<T & { [P in K]: number }> {
        this.fieldMappers.push({
            key,
            mapper: {
                size: 2,
                fromBinary: (buffer, offset) => buffer.getUint16(offset, true),
                toBinary: (value, buffer, offset) => buffer.setUint16(offset, value, true)

            }
        });
        return this as any;
    }

    uint8<K extends string>(key: K): BinaryMessageMapper<T & { [P in K]: number }> {
        this.fieldMappers.push({
            key,
            mapper: {
                size: 1,
                fromBinary: (buffer, offset) => buffer.getUint8(offset),
                toBinary: (value, buffer, offset) =>
                    buffer.setUint8(offset, value)
            }
        });
        return this as any;
    }

    float32<K extends string>(key: K): BinaryMessageMapper<T & { [P in K]: number }> {
        this.fieldMappers.push({
            key,
            mapper: {
                size: 4,
                fromBinary: (buffer, offset) => buffer.getFloat32(offset, true),
                toBinary: (value, buffer, offset) => buffer.setFloat32(offset, value, true)
            }
        });
        return this as any;
    }

    bool<K extends string>(key: K): BinaryMessageMapper<T & { [P in K]: boolean }> {
        this.fieldMappers.push({
            key,
            mapper: {
                size: 1,
                fromBinary: (buffer, offset) => buffer.getUint8(offset) === 1,
                toBinary: (value, buffer, offset) => buffer.setUint8(offset, value ? 1 : 0)
            }
        });
        return this as any;
    }

    fromBinary(buffer: DataView, offset: number): T {
        const result: any = {};
        for (const fieldMapper of this.fieldMappers) {
            result[fieldMapper.key] = fieldMapper.mapper.fromBinary(buffer, offset);
            offset += fieldMapper.mapper.size;
        }
        return result;
    }

    size() {
        return this.fieldMappers.reduce((acc, fieldMapper) => acc + fieldMapper.mapper.size, 0);
    }

    toBinary(value: T, buffer: DataView, offset: number): DataView {
        for (const fieldMapper of this.fieldMappers) {
            fieldMapper.mapper.toBinary(value[fieldMapper.key as keyof T], buffer, offset);
            offset += fieldMapper.mapper.size;
        }
        return buffer;
    }
}

export type MessageType<T> = T extends BinaryMessageMapper<infer U> ? U : never;