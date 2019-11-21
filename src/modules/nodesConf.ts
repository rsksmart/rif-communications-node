// Peer generator

import * as readline from "readline";

import { FsStore } from "datastore-fs";
// import * as myArgs from 'yargs'
import { createNode } from "./createNode";

const datastore = new FsStore("./node-keysotre");

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
  .default("nodes", 10) // ONlY for test scenario
  .default("algorithm", "DEFAULT")
  .default("ofuscate", true).argv;

const activeChats = new Map();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const generateKey = myArgs.key;

exports.createPeer = (keyname, callback) => createNode(keyname, callback);

export { myArgs, generateKey, datastore };
