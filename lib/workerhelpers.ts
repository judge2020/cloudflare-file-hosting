export function ArrayBufferToString(buffer, encoding = 'utf8') {
    return Buffer.from(buffer).toString(encoding)
}
