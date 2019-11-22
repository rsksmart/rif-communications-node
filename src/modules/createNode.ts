// Create a node/peer instance

import { WebRTCBundle, WebSocketBundle } from './wRTCbundle'

import { create } from 'peer-info'
import { createKey } from './createKey'
import Multiaddr from 'multiaddr'
import { myArgs } from './nodesConf'
import { waterfall } from 'async'

const generateKey = myArgs.key

export default function createNode(keyname: any, callback: (arg0: null, arg1: any) => void) {
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
          console.log('USING WEB RTC')
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
          console.log(peerInfo)
          node.start(cb)
        } else {
          console.log('USING ONLY SOCKET')
          peerInfo.multiaddrs.add(
            new Multiaddr(
              '/ip4/' + myArgs.host + '/tcp/' + myArgs.socketport + '/ws'
            )
          )
          node = new WebSocketBundle({
            peerInfo
          })

          node.on('peer', (peerInfo: any) => {
            console.log('Recibi algo ')
            console.log(peerInfo)
          })

          node.on('peer:discovery', (peerInfo: any) => {
            console.log(
              'Discovered a peer from here: ',
              peerInfo.id.toB58String()
            )
          })

          node.on('peer:connect', (peerInfo: any) => {
            const idStr = peerInfo.id.toB58String()
            console.log('Got connection to: ' + idStr)
          })

          node.on('peer:disconnect', (peerInfo: any) => {
            const idStr = peerInfo.id.toB58String()
            console.log('Got discconected from %s ', idStr)
          })

          node.dht.registerListener(
            'kad-msg-received',
            (kadMsg: string) => {
              console.log('[Contact] -> ' + kadMsg)
            },
            () => {
              node.start(cb)
            }
          )
        }
      }
    ],
    (err: any) => {
      callback(null, node)
    }
  )
}
