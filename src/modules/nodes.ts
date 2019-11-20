// Peer generator

import { CID } from 'cids'
import { FsStore } from 'datastore-fs'
import { KadDHT } from 'libp2p-kad-dht'
import { Keychain } from 'libp2p-keychain'
import { Mplex } from 'libp2p-mplex'
import { PeerId } from 'peer-id'
import { PeerInfo } from 'peer-info'
import * as readline from 'readline'
import { SECIO } from 'libp2p-secio'
import { TCP } from 'libp2p-tcp'
import { WS } from 'libp2p-websockets'
import { Wstar } from 'libp2p-webrtc-star'
import { cryptoUtil } from 'libp2p-crypto'
import { defaultsDeep } from '@nodeutils/defaults-deep'
import { libp2p } from 'libp2p'
import { multiaddr } from 'multiaddr'
import { multihashingAsync } from 'multihashing-async'
import { myArgs } from 'yargs'
import { parallel } from 'async/parallel'
import { waterfall } from 'async/waterfall'
import { wrtc } from 'wrtc'

const datastore = new FsStore('./node-keysotre')

const myArgs = require("yargs")
  .default("socketport", "0")
  .default("host", "127.0.0.1")
  .default("port", "9090")
  .option("webrtc", {
    type: "boolean",
    default: false
  })
  .default("keyname", "defaultkeyname")
  .default("keytype", "secp256k1")
  .option("autostart", {
    type: "boolean",
    default: false,
    description: "Automatically start"
  })
  .option("isbootnode", {
    type: "boolean",
    default: false,
    description: "Run as bootnode"
  })
  .default("key", true)
  .default("automated", false)
  .default("nodes", 10)
  .default("boot", "1,2")
  .default("sender", "3")
  .default("receiver", "4")
  .default("message", "default message content")
  .default("algorithm", "DEFAULT")
  .default("ofuscate", true).argv;

let keychain = null;
let activeChats = new Map();
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
const generateKey = myArgs.key;
const bootnode = myArgs.isbootnode;
const autostart = myArgs.autostart;
if (myArgs.passphrase != undefined) {
  keychain = new Keychain(datastore, {
    passPhrase: myArgs.passphrase
  });
}
