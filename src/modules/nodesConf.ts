// Peer generator

import * as yargs from 'yargs'

import FsStore from 'datastore-fs'
import createNode from './createNode'

const datastore = new FsStore('./node-keystore')

const myArgs = yargs
  .option('socketport', {
    type: 'number',
    default: 0
  })
  .default('host', '127.0.0.1')
  .default('port', '9090')
  .option('webrtc', {
    type: 'boolean',
    default: false
  })
  .default('keyname', 'defaultkeyname')
  .default('keytype', 'secp256k1')
  .option('bootNodeAddr', {
    type: 'string',
    description: 'Address of a bootnode to connect to'
  })
  .default('key', true)
  .default('automated', false)
  .default('nodes', 10) // ONlY for test scenario
  .default('algorithm', 'DEFAULT')
  .default('ofuscate', true).argv

// const activeChats = new Map()

const generateKey = myArgs.key

exports.createPeer = (keyname: string, callback: () => void) =>
  createNode(keyname, callback)

export { myArgs, generateKey, datastore }
