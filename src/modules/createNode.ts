// Create a node/peer instance

import { WebRTCBundle, WebSocketBundle } from "./wRTCbundle";

import { create } from "peer-info";
import { createFromPrivKey, createFromPubKey, createFromJSON } from "peer-id";
import { createKey } from "./createKey";
import {
  myArgs,
  addSocketMultiaddress,
  addWebRTCMultiaddress,
  datastore
} from "./nodesConf";
import { waterfall } from "async";
import Keychain from "libp2p-keychain";
import logger from "../logger";
import Libp2p from "libp2p";

const generateKey = myArgs.key;

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

export function createNodeFromPrivateKey(callback: any) {
  let node: any;

  waterfall(
    [
      async (cb: (arg0: Error | null, arg1: any) => void) => {
        if (myArgs.keystore !== "") {
          //Store new peerId JSON encrypted using key stored in keystore
          const keychain = new Keychain(datastore, {
            passPhrase: myArgs.passphrase
          });
          const privKey: string = await keychain._getPrivateKey(myArgs.keyname);
          cb(null, privKey);
        } else {
          cb(new Error("KeyStore is mandatory when loading a key"), null);
        }
      },
      (privKey: string, cb: any) => {
        createFromPrivKey(privKey, cb);
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

export function createNode(
  keyname: any,
  callback: (arg0: Error | null, arg1: any) => void
) {
  let node: any;

  if (typeof keyname === "function") {
    callback = keyname;
    keyname = undefined;
  }

  waterfall(
    [
      (cb: (arg0: null, arg1: null) => void) => {
        if (generateKey) createKey(keyname, cb);
        else cb(null, null);
      },
      (peerId: any, cb: any) => {
        if (myArgs.keystore !== "") {
          //Store new peerId JSON encrypted using key stored in keystore
          const keychain = new Keychain(datastore, {
            passPhrase: myArgs.passphrase
          });
          keychain.importPeer("peer-key", peerId);
        }
        cb(peerId, cb);
      },
      (peerId: any, cb: any) => {
        if (generateKey) create(peerId, cb);
        else create(cb);
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
