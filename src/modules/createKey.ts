// Generate the Key for Peers

import { myArgs } from "./nodesConf";

import { PeerIdWithIs, create, createWithKeyChain } from "peer-id";

const generateKey = myArgs.createKey;

function createKey(keyname: any, callback: any) {
  if (typeof keyname === "function") {
    callback = keyname;
    keyname = undefined;
  }

  if (generateKey) {
    let opts;

    if (myArgs.keytype === "secp256k1") {
      opts = {
        bits: 256,
        keyType: "secp256k1"
      };
    } else {
      opts = {
        bits: 2048,
        keyType: "RSA"
      };
    }

    console.log("Creating key with type %s", opts != null ? opts.keyType : "");
    create(opts, (err: Error, peer: PeerIdWithIs) => {
      if (err) {
        throw err;
      }
      callback(null, peer);
    });
  } else {
    console.log("Not generating key");
    callback(null);
  }
}

export { createKey };
