// TODO: CHECK THE ACTUAL IMPLEMENTATION AND CREATE RIGHT TYPINGs

declare module 'peer-info' {

  class MultiaddrSet {
    public add: (a: any) => {}
  }

  export class PeerInfo {
    id: any;
    multiaddrs: MultiaddrSet;
    constructor (peerId: any)
  }
  export const create: (_options: any, callback?: (err: Error, peer: PeerInfo, callback: () => void) => void) => void
}
