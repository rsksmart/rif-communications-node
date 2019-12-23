// Peer generator

import * as yargs from "yargs";

import LevelStore from "datastore-level"; //Web-Browser compatible store
import { createNode, createNodeFromJSON } from "./createNode";
import Multiaddr from "multiaddr";

const myArgs = yargs
  .option("socketport", {
    type: "number",
    default: 0
  })
  .default("chatClient", false)
  .default("host", "127.0.0.1")
  .default("port", "9090")
  .option("webrtc", {
    type: "boolean",
    default: false
  })
  .default("keyname", "defaultkeyname")
  .default("keytype", "secp256k1")
  .option("bootNodeAddr", {
    type: "string",
    description: "Address of a bootnode to connect to"
  })
  .default("createKey", true)
  .default("keystore", "./node-keystore")
  .default("automated", false)
  .default("nodes", 10) // ONlY for test scenario
  .default("algorithm", "DEFAULT")
  .default("ofuscate", true)
  .default("passphrase", "pass").argv;

const datastore = new LevelStore("./node-keystore", {
  db: require("level")
});

function addWebRTCMultiaddress(peerInfo: any): void {
  const addr = new Multiaddr(
    "/ip4/" +
      myArgs.host +
      "/tcp/" +
      myArgs.port +
      "/wss/p2p-webrtc-star/ipfs/" +
      peerInfo.id.toB58String()
  );
  peerInfo.multiaddrs.add(addr);
}

function addSocketMultiaddress(peerInfo: any): void {
  const addr = new Multiaddr(
    "/ip4/" + myArgs.host + "/tcp/" + myArgs.socketport + "/wss"
  );
  peerInfo.multiaddrs.add(addr);
}

export { addSocketMultiaddress, addWebRTCMultiaddress, myArgs, datastore };
