// Generate the Key for Peers

import { datastore, myArgs } from './nodesConf'

import Keychain from 'libp2p-keychain'
import { PeerIdWithIs, create, createWithKeyChain } from 'peer-id'

const generateKey = myArgs.key

let keychain: any

if (myArgs.passphrase !== undefined) {
  keychain = new Keychain(datastore, {
    passPhrase: myArgs.passphrase
  })
}

function createKey (keyname: any, callback: any) {
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
      createWithKeyChain(
        keychain,
        keyname,
        opts,
        (err: Error, peer: PeerIdWithIs) => {
          if (err) {
            throw err
          }
          callback(null, peer)
        }
      )
    } else {
      create(opts, (err: Error, peer: PeerIdWithIs) => {
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
