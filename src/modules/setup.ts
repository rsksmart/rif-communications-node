import Multiaddr from 'multiaddr'
import mafmt from 'mafmt'

import logger from '../logger'

const multiaddrformats = [
  mafmt.P2P,
  mafmt.WebSockets,
  mafmt.WebRTCDirect,
  mafmt.WebRTCStar
]

/**
 * Check if a Multiaddr string is a valid address.
 *
 * @param multiaddr - a string in Multiaddr format
 *
 * @returns boolean
 */
export function multiaddrValidator (multiaddr: string) {
  return multiaddrformats.some((validator) => validator.matches(multiaddr))
}

/**
 * Apply a timeout to a given promise.
 *
 * @param ms - timeout in milliseconds
 * @param promise - Promise to fulfill or reject
 *
 * @returns Promise<any>
 */
function promiseTimeout (ms: number, promise: Promise<any>) {
  const timeout = new Promise((resolve, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id)
      reject(new Error(`Timed out in ${ms}ms`))
    }, ms)
  })

  return Promise.race([
    promise,
    timeout
  ])
}

/**
 * Try to connect to a bootnode.
 *
 * @param node - a libp2p instance
 * @param bootNodeAddr - a string in Multiaddr format
 *
 * @returns Promise<Connection>
 */
function connectToBootnode (node: any, bootNodeAddr: string) {
  logger.info(`Trying to connect to ${bootNodeAddr}`)
  const dialPromise = new Promise<any>((resolve, reject) => {
    node.dial(new Multiaddr(bootNodeAddr), (err: Error, conn: any) => {
      if (err) {
        logger.warn(`Error connecting to ${bootNodeAddr}: `, err)
        reject(err)
      } else {
        resolve(conn)
      }
    })
  })
  return promiseTimeout(300, dialPromise)
}

/**
 * Iterates bootnodes until the first one is connected.
 *
 * @param node - a libp2p instance
 * @param bootNodeAddresses - a list of strings in Multiaddr format
 *
 * @returns Promise<Connection>
 */
export function processBootnodes (node: any, bootNodeAddresses: string[]) {
  return bootNodeAddresses.reduce((accumulatorPromise: Promise<any>, nextMultiAddress: string) => {
    return accumulatorPromise.catch(() => {
      return connectToBootnode(node, nextMultiAddress)
    })
  }, Promise.reject(new Error()))
}
