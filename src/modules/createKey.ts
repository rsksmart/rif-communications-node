// Generate the Key for Peers

import { myArgs } from './nodesConf'

import { PeerIdWithIs, create } from 'peer-id'

function createKey (keyname: any, callback: any) {
  if (typeof keyname === 'function') {
    callback = keyname
    keyname = undefined
  }

  let opts

  if (myArgs.keytype === 'secp256k1') {
    opts = {
      bits: 256,
      keyType: 'secp256k1'
    }
  } else {
    opts = {
      bits: 2048,
      keyType: 'RSA'
    }
  }

  create(opts, (err: Error, peer: PeerIdWithIs) => {
    if (err) {
      throw err
    }
    callback(null, peer)
  })
}

export { createKey }
