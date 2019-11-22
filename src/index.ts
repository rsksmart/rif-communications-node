// Main process
import * as async from 'async';
import createNode from './modules/createNode';
import cryptoUtil from 'libp2p-crypto';
import Multiaddr from 'multiaddr';
import multihashingAsync from 'multihashing-async';
import { myArgs } from './modules/nodesConf';

const keyname = myArgs.keyname;

function mainProcess() {
  async.waterfall(
    [
      (cb: () => void) => {
        return createNode(keyname, cb);
      }
    ],
    (err: Error | null| undefined, node: any) => {
      console.log('---- YOUR NODE INFORMATION ----');
      console.log('ID: %s', node.peerInfo.id._idB58String);
      console.log('ID length: %s', node.peerInfo.id.id.length);
      console.log('Multiaddresses:');
      node.peerInfo.multiaddrs.forEach((ma: { toString: () => void }) =>
        console.log(ma.toString())
      );
      multihashingAsync.digest(
        node.peerInfo.id.id,
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
              .marshalPublicKey(node.peerInfo.id._pubKey, 'secp256k1')
              .toString('base64')
          );

          if (myArgs.bootNodeAddr){
            async.parallel(
              [
                (cb: () => void) => node.dial(new Multiaddr(myArgs.bootNodeAddr), cb),
                // Set up of the cons might take time
                (cb: () => void) => setTimeout(cb, 300)
              ],
              (err: Error | null| undefined) => {
                if (err) {
                  throw err;
                }

                node.on(
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

mainProcess();
