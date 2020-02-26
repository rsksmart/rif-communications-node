import Multiaddr from 'multiaddr'

import { promiseTimeout } from '../src/modules/utils'

import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import dirtyChai from 'dirty-chai'

chai.config.includeStack = true // turn on stack trace
// Do not reorder these statements - https://github.com/chaijs/chai/issues/1298
chai.use(chaiAsPromised)
chai.use(dirtyChai)
const expect = chai.expect

describe('Utils functions', () => {
  it('Validating timeout done', async () => {
    const longCall = new Promise((resolve, reject) => {
      setTimeout(resolve, 50, 'done')
    })
    await promiseTimeout(100, longCall).then(message => {
      expect(message).to.be.eq('done')
    })
  })

  it('Validating timeout fail', async () => {
    const longCall = new Promise((resolve, reject) => {
      setTimeout(reject, 600, 'fail')
    })
    await promiseTimeout(100, longCall).catch(e => {
      expect(e).to.be.an('error')
    })
  })
})
