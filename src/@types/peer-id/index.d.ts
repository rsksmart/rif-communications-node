// TODO: CHECK THE ACTUAL IMPLEMENTATION AND CREATE RIGHT TYPINGs

declare module 'peer-id' {
  class PeerId {
    constructor(id: any, privKey: any, pubKey: any);
    toB58String: () => string;
  }

  class PeerIdWithIs extends PeerId {}

  export const createWithKeyChain: (
    keychain: any,
    keyname: any,
    opts: any,
    callback: (err: Error, peer: PeerId) => void
  ) => void
  export const create: (
    _options: any,
    callback: (err: Error, peer: PeerId, callback: () => void) => void
  ) => void
  export const createFromPubKey: (
    key: any,
    callback: (err: Error, peer: PeerId) => void
  ) => void
  export const createFromJSON: (
    obj: any,
    callback: (err: Error, peer: PeerId) => void
  ) => void
}
