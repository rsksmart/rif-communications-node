declare module "libp2p-keychain" {
  import { Datastore } from "interface-datastore";
  export default class Keychain {
    constructor(datastore: Datastore, param2: any);
    _getPrivateKey(name: string): any;
    importPeer(name: string, peer: any): any;
    listKeys(): any;
  }
}
