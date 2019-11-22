// Main process

import * as readline from 'readline';

import createNode from './modules/createNode';
import { cryptoUtil } from 'libp2p-crypto';
import { multiaddr } from 'multiaddr';
import { multihashingAsync } from 'multihashing-async';
import { myArgs } from './modules/nodesConf';
import async from 'async';

const keyname = myArgs.keyname;
const bootnode = myArgs.isbootnode;
const autostart = myArgs.autostart;
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let err: Error;
let pId: string;
let partialAddr: string;
var theNode: any;

function mainProcess() {
  async.waterfall(
    [
      (cb: any) => {
        return createNode(keyname, cb);
      }
    ],
    (err: Error | null| undefined, theNode: any) => {
      const node1 = theNode;
      console.log('---- YOUR NODE INFORMATION ----');
      console.log('ID: %s', node1.peerInfo.id._idB58String);
      console.log('ID length: %s', node1.peerInfo.id.id.length);
      console.log('Multiaddresses:');
      node1.peerInfo.multiaddrs.forEach((ma: { toString: () => void }) =>
        console.log(ma.toString())
      );
      multihashingAsync.digest(
        node1.peerInfo.id.id,
        'sha2-256',
        (err: Error, dhtId: any) => {
          console.log(
            'Internal DHT ID: %s',
            multihashingAsync.multihash.toB58String(dhtId)
          );
          console.log('ID length: %s', dhtId.length);
          console.log(dhtId);
          console.log(
            'Internal DHT ID is displayed for debug pursposes, never reference by this ID'
          );
          console.log('---------------------------');
          console.log('PUBLIC KEY');
          console.log(
            cryptoUtil.keys
              .marshalPublicKey(node1.peerInfo.id._pubKey, 'secp256k1')
              .toString('base64')
          );

          if (!bootnode) {
            let bootNodeMultiaddrs: any;
            async.parallel(
              [
                (cb: any) => node1.dial(multiaddr(bootNodeMultiaddrs), cb),
                // Set up of the cons might take time
                (cb: any) => setTimeout(cb, 300)
              ],
              (err: Error | null| undefined, values: any) => {
                if (err) {
                  throw err;
                }

                node1.on(
                  'peer:discovery',
                  (peer: { id: { toB58String: () => void } }) =>
                    console.log('Discovered:', peer.id.toB58String())
                );
                console.log('Connection Successful');
              }
            );
          }
        }
      );
    }
  );
}

function processNewChatLine() {
  let node1 = theNode;
  let message: string;
  rl.question('.', message => {
    if (message !== '/exit') {
      node1.dht.sendMessage(
        (pId: any, message: string, partialAddr: any, err: Error) => {
          if (err) {
            console.log(err);
          } else {
            processNewChatLine();
          }
        }
      );
    }
    console.log('here is a message or WHAT!?', message);
    return message;
  });
}

if (autostart) {
  mainProcess();
}

processNewChatLine();
