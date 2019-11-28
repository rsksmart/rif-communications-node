declare module 'multihash' {
  export class Multihash {
    /**
     * Convert the given multihash to a hex encoded string.
     */
    toHexString: (hash: Buffer) => string;

    /**
     * Convert the given hex encoded string to a multihash.
     */
    fromHexString: (hash: string) => Buffer

    /**
     * Convert the given multihash to a base58 encoded string.
     */
    toB58String: (hash: Buffer) => string

    /**
     * Convert the given base58 encoded string to a multihash.
     */
    fromB58String: (hash: string|Buffer) => Buffer

    /**
     * Decode a hash from the given multihash.
     */
    decode: (buf: Buffer) => {code: number, name: string, length: number, digest: Buffer}

    /**
     *  Encode a hash digest along with the specified function code.
     *
     * > **Note:** the length is derived from the length of the digest itself.
     */
    encode: (digest: Buffer, code: string|number, length: number) => Buffer

    /**
     * Converts a hash function name into the matching code.
     * If passed a number it will return the number if it's a valid code.
     */
    coerceCode: (name: string|number) => number

    /**
     * Checks wether a code is part of the app range
     */
    appCode: (code: number) => boolean

    /**
     * Checks whether a multihash code is valid.
     */
    validCode: (code: number) => boolean

    /**
     * Check if the given buffer is a valid multihash. Throws an error if it is not valid.
     */
    validate: (multihash: Buffer) => undefined

    /**
     * Returns a prefix from a valid multihash. Throws an error if it is not valid.
     */
    prefix: (multihash: Buffer) => undefined
  }
}
