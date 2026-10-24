import { deflateRawSync } from 'node:zlib';
export function zip(entries) {
  const locals = [], central = []; let offset = 0;
  for (const [name, raw, inflatedSize] of entries) {
    const body = Buffer.from(raw), compressed = deflateRawSync(body), file = Buffer.from(name), local = Buffer.alloc(30), head = Buffer.alloc(46);
    local.writeUInt32LE(0x04034b50); local.writeUInt16LE(8, 8); local.writeUInt32LE(compressed.length, 18); local.writeUInt32LE(inflatedSize ?? body.length, 22); local.writeUInt16LE(file.length, 26);
    head.writeUInt32LE(0x02014b50); head.writeUInt16LE(8, 10); head.writeUInt32LE(compressed.length, 20); head.writeUInt32LE(inflatedSize ?? body.length, 24); head.writeUInt16LE(file.length, 28); head.writeUInt32LE(offset, 42);
    locals.push(local, file, compressed); central.push(head, file); offset += local.length + file.length + compressed.length;
  }
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(Buffer.concat(central).length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...central, end]);
}
