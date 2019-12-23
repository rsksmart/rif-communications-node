declare module "libp2p-keychain" {
  export default class Keychain {
    constructor(datastore: any, param2: any);
    _getPrivateKey(name);
    importPeer(name, peer);
  }
}
