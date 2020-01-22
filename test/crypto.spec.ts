import { exportKey, decryptPrivateKey } from "../src/modules/crypto";
import { createKey } from "../src/modules/createKey";
import { createFromPrivKey } from "peer-id";

import chai from "chai";
import dirtyChai from "dirty-chai";
import chaiAsPromised from "chai-as-promised";
chai.config.includeStack = true; // turn on stack trace

// Do not reorder these statements - https://github.com/chaijs/chai/issues/1298
chai.use(chaiAsPromised);
chai.use(dirtyChai);
const expect = chai.expect;

describe("crypto tests", function() {
  this.timeout(10 * 1000);

  let peerId: any;
  //let privKeyBase64: string;
  // let peerIdFromPrivKey: any;

  before(() => {
    new Promise<void>((resolve, reject) => {
      //Base64 representation of a secp256k1 private key in cleartext
      //privKeyBase64 = "CAISIOHG0RD0BLoxKt4XtYY7yy8I+5c74cFXwSo+/h+rJ/Bz";

      //Generation of a peerId using secp256k1
      createKey("keyname", async (error: any, peerID: any) => {
        peerId = peerID;
        expect(peerId).not.to.eq(null);
        resolve();
      });

      //Generate peerId using the privateKey
      /*createFromPrivKey(privKeyBase64, (error, peerIdObj) => {
        expect(error).to.eq(null);
        peerIdFromPrivKey = peerIdObj;
      });*/
    });
  });

  after(() => {
    peerId = null;
    //privKeyBase64 = null;
  });

  it("export encrypted key using generated peerId", async () => {
    let key = peerId.privKey.bytes;
    let pemKey = await exportKey(peerId, "123456789987654321");
    expect(pemKey).to.include("-----BEGIN ENCRYPTED PRIVATE KEY-----");
    expect(pemKey).to.include("-----END ENCRYPTED PRIVATE KEY-----");

    let decryptedKey = await decryptPrivateKey(pemKey, "123456789987654321");
    expect(key.toString("base64")).to.eq(decryptedKey.toString("base64"));
  });

  it("export encrypted key using private key", async () => {
    let pemKey = await exportKey(peerId, "123456789987654321");
    expect(pemKey).to.include("-----BEGIN ENCRYPTED PRIVATE KEY-----");
    expect(pemKey).to.include("-----END ENCRYPTED PRIVATE KEY-----");
  });
});
