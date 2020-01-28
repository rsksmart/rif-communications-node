import KeyEncoder from 'key-encoder'
const forge = require('node-forge')

const keyEncoder: KeyEncoder = new KeyEncoder('secp256k1')

/* Password-based encryption implementation. */
const pki = forge.pki
const asn1 = forge.asn1

/**
 * Decrypts an  private key.
 *
 * @param pem the PEM-formatted EncryptedPrivateKeyInfo to decrypt.
 * @param password the password to use.
 *
 * @return the key on success, null on failure.
 */
function decryptPrivateKey (pem: any, password: string) {
  let rval = pki.encryptedPrivateKeyFromPem(pem)
  rval = pki.decryptPrivateKeyInfo(rval, password)

  const privKeyDer = new forge.util.ByteBuffer(rval.value[2].value)

  const rawPrivKey = keyEncoder.encodePrivate(privKeyDer.toHex(), 'der', 'raw')

  return Buffer.from(rawPrivKey, 'hex')
}

function generateRawKeyFromKeyInfo (privateKeyInfo: any) {
  return keyEncoder.encodePrivate(privateKeyInfo, 'pem', 'raw')
}

function createPrivateKeyInfo (peerId: any) {
  const pkinfo = keyEncoder.encodePrivate(
    peerId.privKey.marshal().toString('hex'),
    'raw',
    'der'
  )

  // return asn1version;
  // PrivateKeyInfo
  return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
    // version (0)
    asn1.create(
      asn1.Class.UNIVERSAL,
      asn1.Type.INTEGER,
      false,
      asn1.integerToDer(0).getBytes()
    ),
    // privateKeyAlgorithm
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
      asn1.create(
        asn1.Class.UNIVERSAL,
        asn1.Type.OID,
        false,
        asn1.oidToDer('1.2.840.10045.2.1').getBytes()
      ),
      asn1.create(
        asn1.Class.UNIVERSAL,
        asn1.Type.OID,
        false,
        asn1.oidToDer('1.3.132.0.10').getBytes()
      )
    ]),
    // PrivateKey
    asn1.create(
      asn1.Class.UNIVERSAL,
      asn1.Type.OCTETSTRING,
      false,
      new forge.util.ByteBuffer(
        Buffer.from(pkinfo, 'hex').toString('binary')
      ).getBytes()
    )
  ])
}

/**
 * Exports the key into a password protected DER format
 *
 * @param {string} password - The password to read the encrypted PEM.
 * If the password is blank or null then no encryption is used
 * @param {string} [format] - Defaults to 'pkcs-8'.
 * @returns {KeyInfo}
 */
function exportKey (
  peerId: any,
  password: string,
  format = 'pkcs-8'
) {
  if (password !== '') {
    // eslint-disable-line require-await
    let encrypted = null

    if (format === 'pkcs-8') {
      const options = {
        algorithm: 'aes256',
        count: 10000,
        saltSize: 128 / 8,
        prfAlgorithm: 'sha512'
      }

      // Create privateKeyInfo
      const pkinfo = createPrivateKeyInfo(peerId)
      encrypted = forge.pki.encryptPrivateKeyInfo(pkinfo, password, options)
    } else {
      throw new Error(`Unknown export format '${format}'. Must be pkcs-8`)
    }

    return pki.encryptedPrivateKeyToPem(encrypted)
  } else {
    return keyEncoder.encodePrivate(
      peerId.privKey.marshal().toString('hex'),
      'raw',
      'pem'
    )
  }
}

export { exportKey, decryptPrivateKey, generateRawKeyFromKeyInfo }
