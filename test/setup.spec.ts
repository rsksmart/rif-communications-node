import Multiaddr from 'multiaddr'

import { multiaddrValidator, processBootnodes } from '../src/modules/setup'

import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import dirtyChai from 'dirty-chai'

chai.config.includeStack = true // turn on stack trace
// Do not reorder these statements - https://github.com/chaijs/chai/issues/1298
chai.use(chaiAsPromised)
chai.use(dirtyChai)
const expect = chai.expect

describe('Setup functions', () => {
  const bootnodes: string[] = [
    '/ip4/127.0.0.1/tcp/59353/ws/ipfs/16Uiu2HAmDzFfVYLw8Ve853sWMPZdw7ccGpBQr4mWuawdvAmVFj3g',
    '/ip4/127.0.0.1/tcp/59353/ws/ipfs/16Uiu2HAmDzFfVYLw8Ve853sWMPZdw7ccGpBQr4mWuawdvAmVFj2g'
  ]

  it('Validating multiaddresses format', () => {
    expect(multiaddrValidator('garbage')).to.be.false('Invalid multiaddr')
    expect(multiaddrValidator('/ip4/127.0.0.1/tcp/59353/ws/ipfs/16Uiu2HAmDzFfVYLw8Ve853sWMPZdw7ccGpBQr4mWuawdvAmVFj3')).to.be.false('Wrong multiaddr')
    expect(multiaddrValidator('/ip4/127.0.0.1/tcp/59353/ws/ipfs/16Uiu2HAmDzFfVYLw8Ve853sWMPZdw7ccGpBQr4mWuawdvAmVFj3g')).to.be.true()
  })

  it('Validating first bootnode connection attempt', () => {
    const mockNode = {
      dial: (multiaddr: Multiaddr, callback: any) => {
        return callback(null, { connected: true })
      }
    }
    processBootnodes(mockNode, bootnodes)
  })

  it('Validating bootnode fallback', () => {
    let count = 0
    const mockNode = {
      dial: (multiaddr: Multiaddr, callback: any) => {
        count++

        if (count <= 1) {
          return callback(new Error('Fail to connect!'))
        } else {
          return callback(null, { connected: true })
        }
      }
    }
    processBootnodes(mockNode, bootnodes)
  })

  it('Validating timeout', () => {
    const connection = { connected: true }
    const milliseconds = 500
    const mockNode = {
      dial: (multiaddr: Multiaddr, callback: any) => {
        const date = Date.now()
        let currentDate = null
        do {
          currentDate = Date.now()
        } while (currentDate - date < milliseconds)
        callback(null, connection)
      }
    }
    processBootnodes(mockNode, ['/ip4/127.0.0.1/tcp/59353/ws/ipfs/16Uiu2HAmDzFfVYLw8Ve853sWMPZdw7ccGpBQr4mWuawdvAmVFj3g']).then(expectedConnection => {
      expect(expectedConnection).to.equal(connection)
    }).catch(e => {
      expect(e).to.be.null()
    })
  })
})
