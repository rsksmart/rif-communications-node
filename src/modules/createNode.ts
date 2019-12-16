// Create a node/peer instance

import { WebRTCBundle, WebSocketBundle } from './wRTCbundle'

import { create } from 'peer-info'
import { createFromPubKey, createFromJSON, PeerId } from 'peer-id'
import { createKey } from './createKey'
import Multiaddr from 'multiaddr'
import { myArgs } from './nodesConf'
import { waterfall } from 'async'

import logger from '../logger'

const generateKey = myArgs.key

export function createNodeFromPublicKey (
  publicKey: Buffer,
  callback: (arg0: null, arg1: any) => void
) {
  let node: any

  waterfall(
    [
      (cb: (arg0: Error, arg1: PeerId) => void) => {
        createFromPubKey(publicKey, cb)
      },
      (peerId: any, cb: any) => {
        create(peerId, cb)
      },
      (peerInfo: any, cb: any) => {
        if (myArgs.webrtc) {
          peerInfo.multiaddrs.add(
            new Multiaddr(
              '/ip4/' +
                myArgs.host +
                '/tcp/' +
                myArgs.port +
                '/wss/p2p-webrtc-star/ipfs/' +
                peerInfo.id.toB58String()
            )
          )
          peerInfo.multiaddrs.add(
            new Multiaddr(
              '/ip4/' +
                myArgs.host +
                '/tcp/' +
                myArgs.port +
                '/ws/p2p-webrtc-star/ipfs/' +
                peerInfo.id.toB58String()
            )
          )
          node = new WebRTCBundle({
            peerInfo
          })
          logger.log(peerInfo)
          node.start(cb)
        } else {
          peerInfo.multiaddrs.add(
            new Multiaddr(
              '/ip4/' + myArgs.host + '/tcp/' + myArgs.socketport + '/wss'
            )
          )
          peerInfo.multiaddrs.add(
            new Multiaddr(
              '/ip4/' + myArgs.host + '/tcp/' + myArgs.socketport + '/ws'
            )
          )
          node = new WebSocketBundle({
            peerInfo
          })

          node.on('peer', (peerInfo: any) => {
            logger.info('Recibi algo ')
            logger.info(peerInfo)
          })

          node.on('peer:discovery', (peerInfo: any) => {
            logger.info(
              'Discovered a peer from here: ',
              peerInfo.id.toB58String()
            )
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
      }
    ],
    (err: any) => {
      if (err) throw err
      callback(null, node)
    }
  )
}

function _createNode (peerInfo: any, cb: any) {
  let node: any

  if (myArgs.webrtc) {
    peerInfo.multiaddrs.add(
      new Multiaddr(
        '/ip4/' +
          myArgs.host +
          '/tcp/' +
          myArgs.port +
          '/wss/p2p-webrtc-star/ipfs/' +
          peerInfo.id.toB58String()
      )
    )
    peerInfo.multiaddrs.add(
      new Multiaddr(
        '/ip4/' +
          myArgs.host +
          '/tcp/' +
          myArgs.port +
          '/ws/p2p-webrtc-star/ipfs/' +
          peerInfo.id.toB58String()
      )
    )
    node = new WebRTCBundle({
      peerInfo
    })
    logger.info(peerInfo)
    node.start(cb)
  } else {
    peerInfo.multiaddrs.add(
      new Multiaddr(
        '/ip4/' + myArgs.host + '/tcp/' + myArgs.socketport + '/wss'
      )
    )
    peerInfo.multiaddrs.add(
      new Multiaddr('/ip4/' + myArgs.host + '/tcp/' + myArgs.socketport + '/ws')
    )
    node = new WebSocketBundle({
      peerInfo
    })

    node.on('peer', (peerInfo: any) => {
      logger.info('Recibi algo ')
      logger.info(peerInfo)
    })

    node.on('peer:discovery', (peerInfo: any) => {
      logger.info('Discovered a peer from here: ', peerInfo.id.toB58String())
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
}

export function createWebNodeFromJSON (
  nodeJSONObj: any,
  callback: (arg0: Error | undefined, arg1: PeerId) => void
) {
  let node: any

  waterfall(
    [
      (cb: (arg0: Error, arg1: PeerId) => void) => {
        createFromJSON(nodeJSONObj, cb)
      },
      (peerId: any, cb: any) => {
        create(peerId, cb)
      },
      (peerInfo: any, cb: any) => {
        if (myArgs.webrtc) {
          peerInfo.multiaddrs.add(
            new Multiaddr(
              '/ip4/' +
                myArgs.host +
                '/tcp/' +
                myArgs.port +
                '/wss/p2p-webrtc-star/ipfs/' +
                peerInfo.id.toB58String()
            )
          )
          peerInfo.multiaddrs.add(
            new Multiaddr(
              '/ip4/' +
                myArgs.host +
                '/tcp/' +
                myArgs.port +
                '/ws/p2p-webrtc-star/ipfs/' +
                peerInfo.id.toB58String()
            )
          )
          node = new WebRTCBundle({
            peerInfo
          })
          logger.info(peerInfo)
          node.start(cb)
        } else {
          peerInfo.multiaddrs.add(
            new Multiaddr(
              '/ip4/' + myArgs.host + '/tcp/' + myArgs.socketport + '/wss'
            )
          )
          peerInfo.multiaddrs.add(
            new Multiaddr(
              '/ip4/' + myArgs.host + '/tcp/' + myArgs.socketport + '/ws'
            )
          )
          node = new WebSocketBundle({
            peerInfo
          })

          node.on('peer', (peerInfo: any) => {
            logger.info('Recibi algo ')
            logger.info(peerInfo)
          })

          node.on('peer:discovery', (peerInfo: any) => {
            logger.info(
              'Discovered a peer from here: ',
              peerInfo.id.toB58String()
            )
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
      }
    ],
    (err: any) => {
      if (err) throw err
      callback(undefined, node)
    }
  )
}

export function createNodeFromJSON (
  nodeJSONObj: any,
  callback: (arg0: null, arg1: any) => void
) {
  let node: any

  waterfall(
    [
      (cb: (arg0: Error, arg1: PeerId) => void) => {
        createFromJSON(nodeJSONObj, cb)
      },
      (peerId: any, cb: any) => {
        create(peerId, cb)
      },
      (peerInfo: any, cb: any) => {
        if (myArgs.webrtc) {
          peerInfo.multiaddrs.add(
            new Multiaddr(
              '/ip4/' +
                myArgs.host +
                '/tcp/' +
                myArgs.port +
                '/wss/p2p-webrtc-star/ipfs/' +
                peerInfo.id.toB58String()
            )
          )
          peerInfo.multiaddrs.add(
            new Multiaddr(
              '/ip4/' +
                myArgs.host +
                '/tcp/' +
                myArgs.port +
                '/ws/p2p-webrtc-star/ipfs/' +
                peerInfo.id.toB58String()
            )
          )
          node = new WebRTCBundle({
            peerInfo
          })
          logger.info(peerInfo)
          node.start(cb)
        } else {
          peerInfo.multiaddrs.add(
            new Multiaddr(
              '/ip4/' + myArgs.host + '/tcp/' + myArgs.socketport + '/wss'
            )
          )
          peerInfo.multiaddrs.add(
            new Multiaddr(
              '/ip4/' + myArgs.host + '/tcp/' + myArgs.socketport + '/ws'
            )
          )
          node = new WebSocketBundle({
            peerInfo
          })

          node.on('peer', (peerInfo: any) => {
            logger.info('Recibi algo ')
            logger.info(peerInfo)
          })

          node.on('peer:discovery', (peerInfo: any) => {
            logger.info(
              'Discovered a peer from here: ',
              peerInfo.id.toB58String()
            )
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
      }
    ],
    (err: any) => {
      if (err) throw err
      callback(null, node)
    }
  )
}

export function createNode (
  keyname: any,
  callback: (arg0: null, arg1: any) => void
) {
  let node: any

  if (typeof keyname === 'function') {
    callback = keyname
    keyname = undefined
  }

  waterfall(
    [
      (cb: (arg0: null, arg1: null) => void) => {
        if (generateKey) createKey(keyname, cb)
        else cb(null, null)
      },
      (peerId: any, cb: any) => {
        if (generateKey) create(peerId, cb)
        else create(cb)
      },
      (peerInfo: any, cb: any) => {
        if (myArgs.webrtc) {
          logger.info('USING WEB RTC')
          peerInfo.multiaddrs.add(
            new Multiaddr(
              '/ip4/' +
                myArgs.host +
                '/tcp/' +
                myArgs.port +
                '/wss/p2p-webrtc-star/ipfs/' +
                peerInfo.id.toB58String()
            )
          )

          peerInfo.multiaddrs.add(
            new Multiaddr(
              '/ip4/' +
                myArgs.host +
                '/tcp/' +
                myArgs.port +
                '/ws/p2p-webrtc-star/ipfs/' +
                peerInfo.id.toB58String()
            )
          )
          node = new WebRTCBundle({
            peerInfo
          })
          logger.info(peerInfo)
          node.start(cb)
        } else {
          logger.info('USING ONLY SOCKET %s', myArgs.socketport)
          peerInfo.multiaddrs.add(
            new Multiaddr(
              '/ip4/' + myArgs.host + '/tcp/' + myArgs.socketport + '/wss'
            )
          )

          peerInfo.multiaddrs.add(
            new Multiaddr(
              '/ip4/' + myArgs.host + '/tcp/' + myArgs.socketport + '/ws'
            )
          )
          node = new WebSocketBundle({
            peerInfo
          })

          node.on('peer', (peerInfo: any) => {
            logger.info('Recibi algo ')
            logger.info(peerInfo)
          })

          node.on('peer:discovery', (peerInfo: any) => {
            logger.info(
              'Discovered a peer from here: ',
              peerInfo.id.toB58String()
            )
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
      }
    ],
    (err: any) => {
      if (err) throw err
      callback(null, node)
    }
  )
}
