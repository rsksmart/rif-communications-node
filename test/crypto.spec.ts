import { exportKey, decryptPrivateKey } from "../src/modules/crypto";
import { createFromPrivKey } from "peer-id";
import libp2p from "libp2p-crypto";
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

  //marshal()
  const privKeyBase64 = "EEw9ThYZt+Rfq0LbRvgJ+xJpFH7C7uTWK/O2ka7GCOY=";

  //In protobuff, including key type
  /**
  message PrivateKey {
  required KeyType Type = 1;
  required bytes Data = 2;
}` 
*/
  //bytes getter
  const privKeyProtoBase64 = "CAISIBBMPU4WGbfkX6tC20b4CfsSaRR+wu7k1ivztpGuxgjm";

  const password = "123456789987654321";

  before(() => {
    new Promise<void>(async (resolve, reject) => {
      const privKey = await libp2p.keys.supportedKeys.secp256k1.unmarshalSecp256k1PrivateKey(
        Buffer.from(privKeyBase64, "base64")
      );
      const privKeyProtobuffed = privKey.bytes.toString("base64");

      expect(privKeyProtobuffed).to.eq(privKeyProtoBase64);

      //Generate peerId using the privateKey
      createFromPrivKey(privKeyProtobuffed, (error, peerIdObj) => {
        expect(error).to.eq(null);
        peerId = peerIdObj;
      });

      resolve();
    });
  });

  after(() => {
    peerId = null;
  });
  it("export encrypted key using generated peerId", async () => {
    let pemKey = await exportKey(peerId, password);
    let decryptedKey = await decryptPrivateKey(pemKey, password);

    expect(privKeyBase64).to.eq(decryptedKey.toString("base64"));
  });
});
