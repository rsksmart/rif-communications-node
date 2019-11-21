// Create a node/peer instance

import { WebRTCBundle, WebSocketBundle } from './wRTCbundle'

import { PeerInfo } from 'peer-info'
import { createKey } from './createKey'
import { multiaddr } from 'multiaddr'
import { myArgs } from './nodesConf'
import { waterfall } from 'async/waterfall'

const generateKey = myArgs.key

function createNode (keyname, callback) {
  let node

  if (typeof keyname === 'function') {
    callback = keyname
    keyname = undefined
  }

  waterfall(
    [
      cb => {
        if (generateKey) createKey(keyname, cb)
        else cb(null, null)
      },
      (peerId, cb) => {
        if (generateKey) PeerInfo.create(peerId, cb)
        else PeerInfo.create(cb)
      },
      (peerInfo, cb) => {
        if (myArgs.webrtc) {
          console.log('USING WEB RTC')
          peerInfo.multiaddrs.add(
            multiaddr(
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
          console.log(peerInfo)
          node.start(cb)
        } else {
          console.log('USING ONLY SOCKET')
          peerInfo.multiaddrs.add(
            multiaddr(
              '/ip4/' + myArgs.host + '/tcp/' + myArgs.socketport + '/ws'
            )
          )
          node = new WebSocketBundle({
            peerInfo
          })

          node.on('peer', peerInfo => {
            console.log('Recibi algo ')
            console.log(peerInfo)
          })

          node.on('peer:discovery', peerInfo => {
            console.log(
              'Discovered a peer from here: ',
              peerInfo.id.toB58String()
            )
          })

          node.on('peer:connect', peerInfo => {
            const idStr = peerInfo.id.toB58String()
            console.log('Got connection to: ' + idStr)
          })

          node.on('peer:disconnect', peerInfo => {
            const idStr = peerInfo.id.toB58String()
            console.log('Got discconected from %s ', idStr)
          })

          node.dht.registerListener(
            'kad-msg-received',
            kadMsg => {
              console.log('[Contact] -> ' + kadMsg)
            },
            () => {
              node.start(cb)
            }
          )
        }
      }
    ],
    err => {
      callback(null, node)
    }
  )
}

export { createNode }
