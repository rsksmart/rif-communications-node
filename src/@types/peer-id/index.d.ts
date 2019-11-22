declare module 'peer-id' {
    export default class PeerId {
        constructor(
            keychain: any,
            keyname: any,
            opts: any,
            err: Error,
            peer: any
        )
        public createWithKeyChain();
        public create();
    }
}