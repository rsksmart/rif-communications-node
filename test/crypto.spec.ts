import { exportKey, decryptPrivateKey } from '../src/modules/crypto'
import { createFromPrivKey } from 'peer-id'
import libp2p from 'libp2p-crypto'
import chai from 'chai'
import dirtyChai from 'dirty-chai'
import chaiAsPromised from 'chai-as-promised'
import cp from 'child_process'
import KeyEncoder from 'key-encoder'
import fs from 'fs'
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

  // In protobuff, including key type
  /**
  message PrivateKey {
  required KeyType Type = 1;
  required bytes Data = 2;
}`
*/
  // Same private key but enclosed with the protobuff message, also in base64
  const privKeyProtoBase64 = 'CAISIBBMPU4WGbfkX6tC20b4CfsSaRR+wu7k1ivztpGuxgjm'

  // Password used to encrypt the private key
  const password = '123456789987654321'

  before(async () => {
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

  after(() => {
    peerId = null
  })

  it('export encrypted key using generated peerId', async () => {
    // Encrypt the key using pkcs8 format
    const pemKey = exportKey(peerId, password)

    // Decrypt the raw key
    const decryptedKey =  decryptPrivateKey(pemKey.toString(), password)

    // The raw keys should be the same
    expect(privKeyBase64).to.eq(decryptedKey.toString('base64'))

  })

  it('Decrypt key using OpenSSL', async () => {
    // Encrypt the key using pkcs8 format
    const pemKey = exportKey(peerId, password)

    fs.writeFileSync('testFile.pem', pemKey)
    // Use OpenSSL to decrypt the key
    /* const command =
      "openssl ec -passin " + "pass:" + password + " <<< '" + pemKey + "'"; */

    const command = 'openssl ec -in testFile.pem -passin ' + 'pass:' + password

    const ecFormat = cp.execSync(command, { encoding: 'utf-8' }) // the default is 'buffer'

    // Convert the PEM-encoded key to the RAW version
    const rawKey = keyEncoder.encodePrivate(ecFormat, 'pem', 'raw')

    // The raw keys should be the same, first we convert the rawKey to base64
    // since keyEncoder returns an hex-encoded
    expect(privKeyBase64).to.eq(Buffer.from(rawKey, 'hex').toString('base64'))
  })
})
