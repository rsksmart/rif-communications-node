// Main process

import * as myArgs from "./modules/nodesConf";
import * as readline from "readline";

import { createNode } from "./modules/createNode";
import { cryptoUtil } from "libp2p-crypto";
import { multiaddr } from "multiaddr";
import { multihashingAsync } from "multihashing-async";
import { parallel } from "async/parallel";
import { waterfall } from "async/waterfall";

console.log(myArgs);

const keyname = myArgs.keyname;
const bootnode = myArgs.isbootnode;
const autostart = myArgs.autostart;
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let pId: string;

let partialAddr: string;

function processNewChatLine() {
  let message: string;
  rl.question(".", message => {
    if (message != "/exit") {
      node1.dht.sendMessage(pId, message, partialAddr, err => {
        if (err) {
          console.log(err);
        } else {
          processNewChatLine();
        }
      });
    }
  });
  console.log("here is a message or WHAT!?", message);
  return message;
}
console.log("gdsgdsg");

function mainProcess() {
  waterfall([cb => createNode(keyname, cb)], (err, theNode) => {
    const node1 = theNode;

    console.log("---- YOUR NODE INFORMATION ----");
    console.log("ID: %s", node1.peerInfo.id._idB58String);
    console.log("ID length: %s", node1.peerInfo.id.id.length);
    console.log("Multiaddresses:");
    node1.peerInfo.multiaddrs.forEach(ma => console.log(ma.toString()));
    multihashingAsync.digest(node1.peerInfo.id.id, "sha2-256", (err, dhtId) => {
      console.log(
        "Internal DHT ID: %s",
        multihashingAsync.multihash.toB58String(dhtId)
      );
      console.log("ID length: %s", dhtId.length);
      console.log(dhtId);
      console.log(
        "Internal DHT ID is displayed for debug pursposes, never reference by this ID"
      );
      console.log("---------------------------");
      console.log("PUBLIC KEY");
      console.log(
        cryptoUtil.keys
          .marshalPublicKey(node1.peerInfo.id._pubKey, "secp256k1")
          .toString("base64")
      );

      if (!bootnode) {
        // TODO ===> add the hardcoded MultiAddress for the bootnode
        let bootNodeMultiaddrs;
        parallel(
          [
            cb => node1.dial(multiaddr(bootNodeMultiaddrs), cb),
            // Set up of the cons might take time
            cb => setTimeout(cb, 300)
          ],
          (err, values) => {
            if (err) {
              throw err;
            }

            node1.on("peer:discovery", peer =>
              console.log("Discovered:", peer.id.toB58String())
            );
            console.log("Connection Successful");
          }
        );
      }
    });
  });
}

if (autostart) {
  mainProcess();
}

processNewChatLine();
