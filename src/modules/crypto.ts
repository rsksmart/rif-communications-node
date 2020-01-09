const forge = require("node-forge/lib/forge");
/* Password-based encryption implementation. */
var pki = (forge.pki = forge.pki || {});
var oids = pki.oids;
const asn1 = require("node-forge/lib/asn1");
const ecc = require("libp2p-crypto-secp256k1");

// validator for an EncryptedPrivateKeyInfo structure
// Note: Currently only works w/algorithm params
var encryptedPrivateKeyValidator = {
  name: "EncryptedPrivateKeyInfo",
  tagClass: asn1.Class.UNIVERSAL,
  type: asn1.Type.SEQUENCE,
  constructed: true,
  value: [
    {
      name: "EncryptedPrivateKeyInfo.encryptionAlgorithm",
      tagClass: asn1.Class.UNIVERSAL,
      type: asn1.Type.SEQUENCE,
      constructed: true,
      value: [
        {
          name: "AlgorithmIdentifier.algorithm",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.OID,
          constructed: false,
          capture: "encryptionOid"
        },
        {
          name: "AlgorithmIdentifier.parameters",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.SEQUENCE,
          constructed: true,
          captureAsn1: "encryptionParams"
        }
      ]
    },
    {
      // encryptedData
      name: "EncryptedPrivateKeyInfo.encryptedData",
      tagClass: asn1.Class.UNIVERSAL,
      type: asn1.Type.OCTETSTRING,
      constructed: false,
      capture: "encryptedData"
    }
  ]
};

function prfAlgorithmToMessageDigest(prfAlgorithm: any) {
  var factory = forge.md;
  switch (prfAlgorithm) {
    case "hmacWithSHA224":
      factory = forge.md.sha512;
    case "hmacWithSHA1":
    case "hmacWithSHA256":
    case "hmacWithSHA384":
    case "hmacWithSHA512":
      prfAlgorithm = prfAlgorithm.substr(8).toLowerCase();
      break;
    default:
      var error = new Error("Unsupported PRF algorithm.");
      //error.algorithm = prfAlgorithm;
      /*error.supported = [
        "hmacWithSHA1",
        "hmacWithSHA224",
        "hmacWithSHA256",
        "hmacWithSHA384",
        "hmacWithSHA512"
      ];*/
      throw error;
  }
  if (!factory || !(prfAlgorithm in factory)) {
    throw new Error("Unknown hash algorithm: " + prfAlgorithm);
  }
  return factory[prfAlgorithm].create();
}

function createPbkdf2Params(
  salt: any,
  countBytes: any,
  dkLen: any,
  prfAlgorithm: any
) {
  var params = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
    // salt
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false, salt),
    // iteration count
    asn1.create(
      asn1.Class.UNIVERSAL,
      asn1.Type.INTEGER,
      false,
      countBytes.getBytes()
    )
  ]);
  // when PRF algorithm is not SHA-1 default, add key length and PRF algorithm
  if (prfAlgorithm !== "hmacWithSHA1") {
    params.value.push(
      // key length
      asn1.create(
        asn1.Class.UNIVERSAL,
        asn1.Type.INTEGER,
        false,
        forge.util.hexToBytes(dkLen.toString(16))
      ),
      // AlgorithmIdentifier
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        // algorithm
        asn1.create(
          asn1.Class.UNIVERSAL,
          asn1.Type.OID,
          false,
          asn1.oidToDer(pki.oids[prfAlgorithm]).getBytes()
        ),
        // parameters (null)
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, false, "")
      ])
    );
  }
  return params;
}

/**
 * Encrypts a ASN.1 PrivateKeyInfo object, producing an EncryptedPrivateKeyInfo.
 *
 * PBES2Algorithms ALGORITHM-IDENTIFIER ::=
 *   { {PBES2-params IDENTIFIED BY id-PBES2}, ...}
 *
 * id-PBES2 OBJECT IDENTIFIER ::= {pkcs-5 13}
 *
 * PBES2-params ::= SEQUENCE {
 *   keyDerivationFunc AlgorithmIdentifier {{PBES2-KDFs}},
 *   encryptionScheme AlgorithmIdentifier {{PBES2-Encs}}
 * }
 *
 * PBES2-KDFs ALGORITHM-IDENTIFIER ::=
 *   { {PBKDF2-params IDENTIFIED BY id-PBKDF2}, ... }
 *
 * PBES2-Encs ALGORITHM-IDENTIFIER ::= { ... }
 *
 * PBKDF2-params ::= SEQUENCE {
 *   salt CHOICE {
 *     specified OCTET STRING,
 *     otherSource AlgorithmIdentifier {{PBKDF2-SaltSources}}
 *   },
 *   iterationCount INTEGER (1..MAX),
 *   keyLength INTEGER (1..MAX) OPTIONAL,
 *   prf AlgorithmIdentifier {{PBKDF2-PRFs}} DEFAULT algid-hmacWithSHA1
 * }
 *
 * @param obj the ASN.1 PrivateKeyInfo object.
 * @param password the password to encrypt with.
 * @param options:
 *          algorithm the encryption algorithm to use
 *            ('aes128', 'aes192', 'aes256', '3des'), defaults to 'aes128'.
 *          count the iteration count to use.
 *          saltSize the salt size to use.
 *          prfAlgorithm the PRF message digest algorithm to use
 *            ('sha1', 'sha224', 'sha256', 'sha384', 'sha512')
 *
 * @return the ASN.1 EncryptedPrivateKeyInfo.
 */
function encryptPrivateKeyInfo(keyObj: any, password: string, options: any) {
  // set default options

  options = options || {};
  options.saltSize = options.saltSize || 8;
  options.count = options.count || 2048;
  options.algorithm = options.algorithm || "aes128";
  options.prfAlgorithm = options.prfAlgorithm || "sha1";

  // generate PBE params
  var salt = forge.random.getBytesSync(options.saltSize);
  var count = options.count;
  var countBytes = asn1.integerToDer(count);
  var dkLen;
  var encryptionAlgorithm;
  var encryptedData;
  if (options.algorithm.indexOf("aes") === 0 || options.algorithm === "des") {
    // do PBES2
    var ivLen, encOid, cipherFn;
    switch (options.algorithm) {
      case "aes128":
        dkLen = 16;
        ivLen = 16;
        encOid = oids["aes128-CBC"];
        cipherFn = forge.aes.createEncryptionCipher;
        break;
      case "aes192":
        dkLen = 24;
        ivLen = 16;
        encOid = oids["aes192-CBC"];
        cipherFn = forge.aes.createEncryptionCipher;
        break;
      case "aes256":
        dkLen = 32;
        ivLen = 16;
        encOid = oids["aes256-CBC"];
        cipherFn = forge.aes.createEncryptionCipher;
        break;
      case "des":
        dkLen = 8;
        ivLen = 8;
        encOid = oids["desCBC"];
        cipherFn = forge.des.createEncryptionCipher;
        break;
      default:
        var error = new Error(
          "Cannot encrypt private key. Unknown encryption algorithm."
        );
        //error.algorithm = options.algorithm;
        throw error;
    }

    // get PRF message digest

    var prfAlgorithm = "hmacWith" + options.prfAlgorithm.toUpperCase();

    var md = prfAlgorithmToMessageDigest(prfAlgorithm);

    // encrypt private key using pbe SHA-1 and AES/DES
    var dk = forge.pkcs5.pbkdf2(password, salt, count, dkLen, md);

    var iv = forge.random.getBytesSync(ivLen);

    console.log("key");
    console.log(keyObj.bytes);
    const keyBuffer = new forge.util.ByteBuffer(keyObj.bytes);

    console.log("payload der");
    console.log(keyBuffer);
    var cipher = cipherFn(dk);
    cipher.start(iv);
    cipher.update(keyBuffer);

    cipher.finish();
    encryptedData = cipher.output.getBytes();

    // get PBKDF2-params
    var params = createPbkdf2Params(salt, countBytes, dkLen, prfAlgorithm);

    encryptionAlgorithm = asn1.create(
      asn1.Class.UNIVERSAL,
      asn1.Type.SEQUENCE,
      true,
      [
        asn1.create(
          asn1.Class.UNIVERSAL,
          asn1.Type.OID,
          false,
          asn1.oidToDer(oids["pkcs5PBES2"]).getBytes()
        ),
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
          // keyDerivationFunc
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
            asn1.create(
              asn1.Class.UNIVERSAL,
              asn1.Type.OID,
              false,
              asn1.oidToDer(oids["pkcs5PBKDF2"]).getBytes()
            ),
            // PBKDF2-params
            params
          ]),
          // encryptionScheme
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
            asn1.create(
              asn1.Class.UNIVERSAL,
              asn1.Type.OID,
              false,
              asn1.oidToDer(encOid).getBytes()
            ),
            // iv
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false, iv)
          ])
        ])
      ]
    );
  } else if (options.algorithm === "3des") {
    // Do PKCS12 PBE
    dkLen = 24;

    var saltBytes = new forge.util.ByteBuffer(salt);
    var dk = pki.pbe.generatePkcs12Key(password, saltBytes, 1, count, dkLen);
    var iv = pki.pbe.generatePkcs12Key(password, saltBytes, 2, count, dkLen);
    var cipher = forge.des.createEncryptionCipher(dk);
    const keyBuffer = new forge.util.ByteBuffer(keyObj.bytes);
    cipher.start(iv);
    cipher.update(keyBuffer);
    cipher.finish();
    encryptedData = cipher.output.getBytes();

    encryptionAlgorithm = asn1.create(
      asn1.Class.UNIVERSAL,
      asn1.Type.SEQUENCE,
      true,
      [
        asn1.create(
          asn1.Class.UNIVERSAL,
          asn1.Type.OID,
          false,
          asn1.oidToDer(oids["pbeWithSHAAnd3-KeyTripleDES-CBC"]).getBytes()
        ),
        // pkcs-12PbeParams
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
          // salt
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false, salt),
          // iteration count
          asn1.create(
            asn1.Class.UNIVERSAL,
            asn1.Type.INTEGER,
            false,
            countBytes.getBytes()
          )
        ])
      ]
    );
  } else {
    var error = new Error(
      "Cannot encrypt private key. Unknown encryption algorithm."
    );
    //error.algorithm = options.algorithm;
    throw error;
  }

  // EncryptedPrivateKeyInfo
  var rval = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
    // encryptionAlgorithm
    encryptionAlgorithm,
    // encryptedData
    asn1.create(
      asn1.Class.UNIVERSAL,
      asn1.Type.OCTETSTRING,
      false,
      encryptedData
    )
  ]);
  return rval;
}

/**
 * Decrypts an  private key.
 *
 * @param pem the PEM-formatted EncryptedPrivateKeyInfo to decrypt.
 * @param password the password to use.
 *
 * @return the RSA key on success, null on failure.
 */
function decryptPrivateKey(pem: any, password: string) {
  console.log("PEM");
  console.log(pem);

  var rval = pki.encryptedPrivateKeyFromPem(pem);

  //Legacy decryption is not used
  console.log("DER");
  console.log(rval);

  rval = decryptPrivateKeyInfo(rval, password);

  console.log("ASN1");
  console.log(rval);

  return Buffer.from(rval.getBytes(), "binary");
}

/**
 * Decrypts a ASN.1 PrivateKeyInfo object.
 *
 * @param obj the ASN.1 EncryptedPrivateKeyInfo object.
 * @param password the password to decrypt with.
 *
 * @return the ASN.1 PrivateKeyInfo on success, null on failure.
 */
function decryptPrivateKeyInfo(obj: any, password: string) {
  var rval = null;

  // get PBE params
  var capture: any = {};
  var errors: any[] = [];
  if (!asn1.validate(obj, encryptedPrivateKeyValidator, capture, errors)) {
    var error = new Error(
      "Cannot read encrypted private key. " +
        "ASN.1 object is not a supported EncryptedPrivateKeyInfo."
    );
    console.log("Cannot read encrypted private key");
    //error.errors = errors;
    throw error;
  }
  console.log("capture");
  console.log(capture);
  // get cipher
  var oid = asn1.derToOid(capture.encryptionOid);
  console.log("oid");
  console.log(oid);
  var cipher = pki.pbe.getCipher(oid, capture.encryptionParams, password);

  // get encrypted data
  var encrypted = forge.util.createBuffer(capture.encryptedData);
  console.log("Encrypted");
  console.log(encrypted);
  cipher.update(encrypted);
  if (cipher.finish()) {
    console.log("der");
    console.log(cipher.output);
    rval = cipher.output;
  }

  return rval;
}

/**
 * Exports the key into a password protected PEM format
 *
 * @param {string} password - The password to read the encrypted PEM
 * @param {string} [format] - Defaults to 'pkcs-8'.
 * @returns {KeyInfo}
 */
async function exportKey(
  key: any,
  password: string,
  format: string = "pkcs-8"
) {
  // eslint-disable-line require-await
  let encrypted = null;

  if (format === "pkcs-8") {
    const options = {
      algorithm: "aes256",
      count: 10000,
      saltSize: 128 / 8,
      prfAlgorithm: "sha512"
    };

    encrypted = encryptPrivateKeyInfo(key, password, options);
    console.log("Export Key");
    console.log(encrypted);
  } else {
    throw new Error(`Unknown export format '${format}'. Must be pkcs-8`);
  }

  return pki.encryptedPrivateKeyToPem(encrypted);
}

export { exportKey, decryptPrivateKey };
