// Create a node/peer instance

import { WebRTCBundle, WebSocketBundle } from './wRTCbundle'

import { create } from 'peer-info'
import { createFromPrivKey, createFromPubKey, createFromJSON } from 'peer-id'
import { createKey } from './createKey'
import {
  myArgs,
  addSocketMultiaddress,
  addWebRTCMultiaddress,
  keystore
} from './nodesConf'
import { waterfall } from 'async'
import logger from '../logger'
import Libp2p from 'libp2p'
import libCrypto from 'libp2p-crypto'

import DS from 'interface-datastore'
import {
  exportKey,
  decryptPrivateKey,
  generateRawKeyFromKeyInfo
} from './crypto'

function _registerNode (node: any, cb: any) {
  node.on('peer', (peerInfo: any) => {
    logger.info(peerInfo)
  })

  node.on('peer:discovery', (peerInfo: any) => {
    logger.info('Discovered a peer from here: ' + peerInfo.id.toB58String())
  })

  node.on('peer:connect', (peerInfo: any) => {
    const idStr = peerInfo.id.toB58String()
    logger.info('Got connection to: ' + idStr)
  })

  node.on('peer:disconnect', (peerInfo: any) => {
    const idStr = peerInfo.id.toB58String()
    logger.info('Got discconected from %s ', idStr)
  })

  node.dht.registerListener(
    'kad-msg-received',
    (kadMsg: any) => {
      logger.info('[' + kadMsg.sender + '] -> ' + kadMsg.msg)
    },
    () => {
      node.start(cb)
    }
  )
}

function _buildNode (peerInfo: any, cb: any): any {
  let node: Libp2p

  if (myArgs.webrtc) {
    addWebRTCMultiaddress(peerInfo)

    node = new WebRTCBundle({
      peerInfo
    })

    logger.log(peerInfo)
  } else {
    addSocketMultiaddress(peerInfo)
    node = new WebSocketBundle({
      peerInfo
    })
  }
  _registerNode(node, cb)
  return node
}

// This peer won't have a private key, it's intended to generate an object representation
// of a know peer (known by its public key)
export function createNodeFromPublicKey (
  publicKey: Buffer,
  callback: (arg0: null, arg1: any) => void
) {
  let node: any

  waterfall(
    [
      (cb: (arg0: Error, arg1: any) => void) => {
        createFromPubKey(publicKey, cb)
      },
      (peerId: any, cb: any) => {
        create(peerId, cb)
      },
      (peerInfo: any, cb: any) => {
        node = _buildNode(peerInfo, cb)
      }
    ],
    (err: any) => {
      if (err) throw err
      callback(null, node)
    }
  )
}

async function decryptionPhase (privateKey: string, pass: string, cb: any) {
  let decryptedPrivKey: string | Buffer

  if (pass !== '') {
    decryptedPrivKey = decryptPrivateKey(privateKey, pass)
  } else {
    logger.info('Loading plaintext')
    // Convert from binary, which is the format used by the store
    decryptedPrivKey = Buffer.from(
      generateRawKeyFromKeyInfo(privateKey),
      'hex'
    )
  }

  try {
    logger.info(decryptedPrivKey)
    const privKey = await libCrypto.keys.supportedKeys.secp256k1.unmarshalSecp256k1PrivateKey(
      decryptedPrivKey
    )
    createFromPrivKey(privKey.bytes, cb)
  } catch (error) {
    logger.error('ERROR IN DECRYPTION PHASE')
    logger.error(error)
  }
}

export function createNodeFromPrivateKey (callback: any) {
  let node: any

  if (myArgs.privateKey !== '') {
    logger.info('Private key was provided via argument')
    waterfall(
      [
        (cb: (arg0: Error | null, arg1: any) => void) => {
          decryptionPhase(
            myArgs.privateKey,
            myArgs.passphrase ? myArgs.passphrase : '',
            cb
          )
        },
        (peerId: any, cb: any) => {
          logger.info(peerId)
          create(peerId, cb)
        },
        (peerInfo: any, cb: any) => {
          node = _buildNode(peerInfo, cb)
        }
      ],
      (err: any) => {
        if (err) throw err
        callback(undefined, node)
      }
    )
  } else {
    waterfall(
      [
        async (cb: (arg0: Error | null, arg1: any) => void) => {
          if (myArgs.keystore !== '') {
            const dbKey = new DS.Key('/privKeys/' + myArgs.keyname)
            const exists = await keystore.has(dbKey)

            if (!exists) {
              cb(
                new Error(myArgs.keyname + ' does not exist in the keystore'),
                null
              )
            } else {
              const res = await keystore.get(dbKey)
              cb(null, res.toString())
            }
          } else {
            cb(new Error('KeyStore is mandatory when loading a key'), null)
          }
        },
        (privKey: string, cb: any) => {
          decryptionPhase(
            privKey,
            myArgs.passphrase ? myArgs.passphrase : '',
            cb
          )
        },
        (peerId: any, cb: any) => {
          create(peerId, cb)
        },
        (peerInfo: any, cb: any) => {
          node = _buildNode(peerInfo, cb)
        }
      ],
      (err: any) => {
        if (err) throw err
        callback(undefined, node)
      }
    )
  }
}

export function createNodeFromJSON (
  nodeJSONObj: any,
  callback: (arg0: Error | undefined, arg1: any) => void
) {
  let node: any

  waterfall(
    [
      (cb: (arg0: Error, arg1: any) => void) => {
        createFromJSON(nodeJSONObj, cb)
      },
      (peerId: any, cb: any) => {
        create(peerId, cb)
      },
      (peerInfo: any, cb: any) => {
        node = _buildNode(peerInfo, cb)
      }
    ],
    (err: any) => {
      if (err) throw err
      callback(undefined, node)
    }
  )
}

export function createNode (callback: (arg0: Error | null, arg1: any) => void) {
  let node: any

  if (typeof myArgs.keyname === 'function') {
    callback = myArgs.keyname
    myArgs.keyname = undefined
  }

  waterfall(
    [
      (cb: (arg0: null, arg1: null) => void) => {
        createKey(myArgs.keyname, cb)
      },
      async (peerId: any, cb: any) => {
        if (myArgs.keystore !== '' && myArgs.keyname !== undefined) {
          // Store new peerId JSON encrypted using key stored in keystore
          const dbKey = new DS.Key('/privKeys/' + myArgs.keyname)
          const exists = await keystore.has(dbKey)

          if (exists) {
            cb(
              new Error(myArgs.keyname + ' already exists in the keystore'),
              null
            )
          } else {
            const batch = keystore.batch()
            // If passphrase is blank then the key is not encrypted
            const privKeyEnc = exportKey(peerId, myArgs.passphrase ? myArgs.passphrase : '')
            batch.put(dbKey, privKeyEnc)
            try {
              await batch.commit()
            } catch (error) {
              logger.error(error)
            }
          }
        }
        cb(null, peerId)
      },
      (peerId: any, cb: any) => {
        create(peerId, cb)
      },
      (peerInfo: any, cb: any) => {
        node = _buildNode(peerInfo, cb)
      }
    ],
    (err: any) => {
      if (err) throw err
      callback(null, node)
    }
  )
}
