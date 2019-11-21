// Generate the Key for Peers

import { datastore, myArgs } from './nodesConf'

import { Keychain } from 'libp2p-keychain'
import { PeerId } from 'peer-id'
import { error } from 'console'

const generateKey = myArgs.key

let keychain: string

if (myArgs.passphrase !== undefined) {
  keychain = new Keychain(datastore, {
    passPhrase: myArgs.passphrase
  })
}

function createKey (keyname: string, callback) {
  if (typeof keyname === 'function') {
    callback = keyname
    keyname = undefined
  }

  if (generateKey) {
    let opts

    if (myArgs.keytype === 'secp256k1') {
      opts = {
        bits: 256,
        keyType: 'secp256k1'
      }
    }

    if (keychain != null) {
      if (myArgs.keytype !== 'RSA') {
        throw new Error('Only RSA is supported in the keychain at the moment')
      }
      opts = {
        bits: 2048,
        keyType: 'RSA'
      }
      PeerId.createWithKeyChain(keychain, keyname, opts, (err, peer) => {
        if (err) {
          throw err
        }
        callback(null, peer)
      })
    } else {
      PeerId.create(opts, (err, peer) => {
        if (err) {
          throw err
        }
        callback(null, peer)
      })
    }
  } else {
    callback(null)
  }
}

export { createKey }
