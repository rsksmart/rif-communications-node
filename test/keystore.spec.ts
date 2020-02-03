import { exportKey } from '../src/modules/crypto'
import { createFromPrivKey } from 'peer-id'
import libp2p from 'libp2p-crypto'
import chai from 'chai'
import dirtyChai from 'dirty-chai'
import chaiAsPromised from 'chai-as-promised'
import cp from 'child_process'
import KeyEncoder from 'key-encoder'
import fs from 'fs'
import DS from 'interface-datastore'
import { keystore } from '../src/modules/nodesConf'
const keyEncoder: KeyEncoder = new KeyEncoder('secp256k1')

chai.config.includeStack = true // turn on stack trace
// Do not reorder these statements - https://github.com/chaijs/chai/issues/1298
chai.use(chaiAsPromised)
chai.use(dirtyChai)
const expect = chai.expect
describe('crypto tests', function () {
  this.timeout(10 * 1000)

  let peerId: any

  // marshal()
  // A test EC Private Key in Base64  (a RAW key) obtained using the marshal() method
  const privKeyBase64 = 'EEw9ThYZt+Rfq0LbRvgJ+xJpFH7C7uTWK/O2ka7GCOY='

  // Same private key but enclosed with the protobuff message, also in base64
  const privKeyProtoBase64 = 'CAISIBBMPU4WGbfkX6tC20b4CfsSaRR+wu7k1ivztpGuxgjm'

  // Password used to encrypt the private key
  const password = '123456789987654321'

  const file = './test/testKeyFile.pem'

  before(async () => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file)
    }
    // Create a privateKey object using the raw key
    const privKey = await libp2p.keys.supportedKeys.secp256k1.unmarshalSecp256k1PrivateKey(
      Buffer.from(privKeyBase64, 'base64')
    )

    // Double check the protobuffed version is OK (should be)
    const privKeyProtobuffed = privKey.bytes.toString('base64')
    expect(privKeyProtobuffed).to.eq(privKeyProtoBase64)

    // Generate peerId object using the privateKey
    createFromPrivKey(privKeyProtobuffed, (error, peerIdObj) => {
      expect(error).to.eq(null)
      peerId = peerIdObj
    })
  })

  after(async () => {
    peerId = null
    const dbKey = new DS.Key('/privKeys/' + 'testKeyName')
    const batch = keystore.batch()

    batch.delete(dbKey)
    await batch.commit()

    if (fs.existsSync(file)) {
      fs.unlinkSync(file)
    }
  })

  it('Decrypt key reading it from the keystore', async () => {
    // Encrypt the key using pkcs8 format

    const dbKey = new DS.Key('/privKeys/' + 'testKeyName')
    let exists = await keystore.has(dbKey)
    expect(exists).to.eq(false)

    const pemKey = exportKey(peerId, password)

    const batch = keystore.batch()
    batch.put(dbKey, pemKey)
    await batch.commit()

    exists = await keystore.has(dbKey)
    expect(exists).to.eq(true)

    const res = await keystore.get(dbKey)
    const key = res.toString()

    fs.writeFileSync(file, key)
    // Use OpenSSL to decrypt the key

    const command = 'openssl ec -in ' + file + ' -passin ' + 'pass:' + password

    const ecFormat = cp.execSync(command, { encoding: 'utf-8' }) // the default is 'buffer'

    // Convert the PEM-encoded key to the RAW version
    const rawKey = keyEncoder.encodePrivate(ecFormat, 'pem', 'raw')

    // The raw keys should be the same, first we convert the rawKey to base64
    // since keyEncoder returns an hex-encoded
    expect(privKeyBase64).to.eq(Buffer.from(rawKey, 'hex').toString('base64'))
  })
})
