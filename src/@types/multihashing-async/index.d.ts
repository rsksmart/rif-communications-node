declare module "multihashing-async" {
  export const multihash: Multihash;

  export const digest: (
    id: any,
    encryptiong: string,
    callback: (err: Error, dhtId: any) => void
  ) => void;
}
