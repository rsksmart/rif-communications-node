// Create a node/peer instance

import { WebRTCBundle, WebSocketBundle } from "./wRTCbundle";

import { create } from "peer-info";
import { createFromPrivKey, createFromPubKey, createFromJSON } from "peer-id";
import { createKey } from "./createKey";
import {
  myArgs,
  addSocketMultiaddress,
  addWebRTCMultiaddress,
  keystore
} from "./nodesConf";
import { waterfall } from "async";
import logger from "../logger";
import Libp2p from "libp2p";
import DS from "interface-datastore";
import { exportKey, decryptPrivateKey } from "./crypto";
import bs58 from "bs58";

function _registerNode(node: any, cb: any) {
  node.on("peer", (peerInfo: any) => {
    logger.info(peerInfo);
  });

  node.on("peer:discovery", (peerInfo: any) => {
    logger.info("Discovered a peer from here: " + peerInfo.id.toB58String());
  });

  node.on("peer:connect", (peerInfo: any) => {
    const idStr = peerInfo.id.toB58String();
    logger.info("Got connection to: " + idStr);
  });

  node.on("peer:disconnect", (peerInfo: any) => {
    const idStr = peerInfo.id.toB58String();
    logger.info("Got discconected from %s ", idStr);
  });

  node.dht.registerListener(
    "kad-msg-received",
    (kadMsg: any) => {
      logger.info("[" + kadMsg.sender + "] -> " + kadMsg.msg);
    },
    () => {
      node.start(cb);
    }
  );
}

function _buildNode(peerInfo: any, cb: any): any {
  let node: Libp2p;

  if (myArgs.webrtc) {
    addWebRTCMultiaddress(peerInfo);

    node = new WebRTCBundle({
      peerInfo
    });

    logger.log(peerInfo);
  } else {
    addSocketMultiaddress(peerInfo);
    node = new WebSocketBundle({
      peerInfo
    });
  }
  _registerNode(node, cb);
  return node;
}

//This peer won't have a private key, it's intended to generate an object representation
//of a know peer (known by its public key)
export function createNodeFromPublicKey(
  publicKey: Buffer,
  callback: (arg0: null, arg1: any) => void
) {
  let node: any;

  waterfall(
    [
      (cb: (arg0: Error, arg1: any) => void) => {
        createFromPubKey(publicKey, cb);
      },
      (peerId: any, cb: any) => {
        create(peerId, cb);
      },
      (peerInfo: any, cb: any) => {
        node = _buildNode(peerInfo, cb);
      }
    ],
    (err: any) => {
      if (err) throw err;
      callback(null, node);
    }
  );
}

function decryptionPhase(privateKey: any, pass: string, cb: any) {
  let decryptedPrivKey;
  if (pass !== "") {
    decryptedPrivKey = decryptPrivateKey(privateKey, pass);
  } else {
    //Convert from binary, which is the format used by the store
    decryptedPrivKey = Buffer.from(privateKey, "binary");
  }

  try {
    createFromPrivKey(decryptedPrivKey, cb);
  } catch (error) {
    console.log("ERROR IN DECRYPTION PHASE");
    console.log(error);
  }
}

export function createNodeFromPrivateKey(callback: any) {
  let node: any;

  if (myArgs.privateKey !== "") {
    console.log("Private key was provided via argument");
    waterfall(
      [
        (cb: (arg0: Error | null, arg1: any) => void) => {
          decryptionPhase(
            Buffer.from(myArgs.privateKey, "base64"),
            myArgs.passphrase == undefined ? "" : myArgs.passphrase,
            cb
          );
        },
        (peerId: any, cb: any) => {
          //console.log("Your peer id");
          console.log(peerId);
          create(peerId, cb);
        },
        (peerInfo: any, cb: any) => {
          node = _buildNode(peerInfo, cb);
        }
      ],
      (err: any) => {
        if (err) throw err;
        callback(undefined, node);
      }
    );
  } else {
    //console.log("LOADING KEY FROM STORE");
    waterfall(
      [
        async (cb: (arg0: Error | null, arg1: any) => void) => {
          if (myArgs.keystore !== "") {
            const dbKey = new DS.Key("/privKeys/" + myArgs.keyname);
            const exists = await keystore.has(dbKey);
            if (!exists) {
              cb(
                new Error(myArgs.keyname + " does not exist in the keystore"),
                null
              );
            } else {
              const res = await keystore.get(dbKey);
              cb(null, res.toString());
            }
          } else {
            cb(new Error("KeyStore is mandatory when loading a key"), null);
          }
        },
        (privKey: string, cb: any) => {
          decryptionPhase(
            privKey,
            myArgs.passphrase == undefined ? "" : myArgs.passphrase,
            cb
          );
        },
        (peerId: any, cb: any) => {
          //console.log("Your peer id");
          //console.log(peerId);
          create(peerId, cb);
        },
        (peerInfo: any, cb: any) => {
          node = _buildNode(peerInfo, cb);
        }
      ],
      (err: any) => {
        if (err) throw err;
        callback(undefined, node);
      }
    );
  }
}

export function createNodeFromJSON(
  nodeJSONObj: any,
  callback: (arg0: Error | undefined, arg1: any) => void
) {
  let node: any;

  waterfall(
    [
      (cb: (arg0: Error, arg1: any) => void) => {
        createFromJSON(nodeJSONObj, cb);
      },
      (peerId: any, cb: any) => {
        create(peerId, cb);
      },
      (peerInfo: any, cb: any) => {
        node = _buildNode(peerInfo, cb);
      }
    ],
    (err: any) => {
      if (err) throw err;
      callback(undefined, node);
    }
  );
}

export function createNode(callback: (arg0: Error | null, arg1: any) => void) {
  let node: any;
  //console.log("CREATING FRESH KEY");

  if (typeof myArgs.keyname === "function") {
    callback = myArgs.keyname;
    myArgs.keyname = undefined;
  }

  waterfall(
    [
      (cb: (arg0: null, arg1: null) => void) => {
        createKey(myArgs.keyname, cb);
      },
      async (peerId: any, cb: any) => {
        if (myArgs.keystore !== "" && myArgs.keyname !== undefined) {
          //Store new peerId JSON encrypted using key stored in keystore
          const dbKey = new DS.Key("/privKeys/" + myArgs.keyname);
          const exists = await keystore.has(dbKey);
          if (exists) {
            cb(
              new Error(myArgs.keyname + " already exists in the keystore"),
              null
            );
          } else {
            const batch = keystore.batch();
            //If passphrase is blank then the key is not encrypted
            const privKeyEnc = await exportKey(
              peerId,
              myArgs.passphrase == undefined || myArgs.passphrase == null
                ? ""
                : myArgs.passphrase
            );
            /*console.log("<========Putting key in db========>");
            console.log("DB entry keyname:");
            console.log(bs58.encode(dbKey.toBuffer()));
            console.log("Cleartext private key");
            console.log(Buffer.from(peerId.privKey.bytes).toString("base64"));
            console.log("Encrypted private key (base 64)");
            console.log(Buffer.from(privKeyEnc).toString("base64"));
            console.log("Password: ");
            console.log(myArgs.passphrase);*/
            batch.put(dbKey, privKeyEnc);
            try {
              await batch.commit();
            } catch (error) {
              console.log(error);
            }

            //console.log("</=======Putting key in db========>");
          }
        }
        cb(null, peerId);
      },
      (peerId: any, cb: any) => {
        create(peerId, cb);
      },
      (peerInfo: any, cb: any) => {
        node = _buildNode(peerInfo, cb);
      }
    ],
    (err: any) => {
      if (err) throw err;
      callback(null, node);
    }
  );
}
