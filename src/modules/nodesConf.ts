// Peer generator

import * as yargs from 'yargs'

import LevelStore from 'datastore-level' // Web-Browser compatible store
import Multiaddr from 'multiaddr'

const myArgs = yargs
  .option('socketport', {
    type: 'number',
    default: 0
  })
  .option('chatClient', {
    type: 'boolean',
    default: false
  })
  .option('webrtc', {
    type: 'boolean',
    default: false
  })
  .option('bootNodeAddr', {
    type: 'string',
    description: 'Address of a bootnode to connect to'
  })
  .option('createKey', {
    type: 'boolean',
    description:
      '[true]: The user wants a new peerId (new keypair for the peer node)' +
      'the key is securely saved on the keystore using the provided passphrase and keyname' +
      '[false]: The user wants to reuse their node credentials' +
      'the key is obtained from the secure keystore, using the provided passhprase and keyname'
  })
  .option('ofuscate', {
    type: 'boolean',
    default: true,
    description: 'Ofuscate sender address'
  })
  .option('automated', { type: 'boolean', defaul: false })
  .option('keyname', {
    type: 'string',
    description:
      'name of the key to use from the keychain to authenticate. If createKey is true ' +
      ' then this is the name that will be used to store the new key in the keychain'
  })
  .default('keytype', 'secp256k1')
  .default('host', '127.0.0.1')
  .default('port', '9090')
  .default('keystore', './node-keystore')
  .default('nodes', 10) // ONlY for test scenario
  .default('algorithm', 'DEFAULT')
  .option('privateKey', {
    type: 'string',
    alias: 'private-key',
    default: '',
    description:
      "The private key data, if passphrase is provided then it's treated as an encrypted" +
      ' key following pkcs8 standard'
  })
  .option('passphrase', {
    type: 'string',
    alias: 'pwd',
    description:
      'password to access the node, it must be the one corresponding to the keyname.' +
      'In case createKey is true, then is the password that will be used for that keyname'
  }).argv

const keystore = new LevelStore('./node-keystore')

function addWebRTCMultiaddress (peerInfo: any): void {
  const addr = new Multiaddr(
    '/ip4/' +
      myArgs.host +
      '/tcp/' +
      myArgs.port +
      '/wss/p2p-webrtc-star/ipfs/' +
      peerInfo.id.toB58String()
  )
  peerInfo.multiaddrs.add(addr)
}

function addSocketMultiaddress (peerInfo: any): void {
  const addr = new Multiaddr(
    '/ip4/' + myArgs.host + '/tcp/' + myArgs.socketport + '/wss'
  )
  peerInfo.multiaddrs.add(addr)
}

export { addSocketMultiaddress, addWebRTCMultiaddress, myArgs, keystore }
