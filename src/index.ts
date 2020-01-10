// Main process
import * as async from "async";
import { createNode, createNodeFromPrivateKey } from "./modules/createNode";
import cryptoUtil from "libp2p-crypto";
import Multiaddr from "multiaddr";
import multihashingAsync from "multihashing-async";
import { myArgs } from "./modules/nodesConf";
import { CommandLineChat } from "./modules/chatClient";
import logger from "./logger";

process.on("unhandledRejection", (reason, p) =>
  logger.error("Unhandled Rejection at: Promise ", p, reason)
);

const keyname = myArgs.keyname;

function mainProcess() {
  async.waterfall(
    [
      (cb: () => void) => {
        myArgs.createKey
          ? createNode(keyname, cb)
          : createNodeFromPrivateKey(cb);
      }
    ],
    (err: Error | null | undefined, node: any) => {
      if (err) throw err;

      logger.info("==== YOUR NODE INFORMATION ====");
      logger.info("ID: %s", node.peerInfo.id._idB58String);
      logger.info("ID length: %s", node.peerInfo.id.id.length);
      logger.info("Multiaddresses:");
      node.peerInfo.multiaddrs.forEach((ma: { toString: () => string }) =>
        logger.info(ma.toString())
      );
      multihashingAsync.digest(
        node.peerInfo.id.id,
        "sha2-256",
        (err: Error, dhtId: any) => {
          if (err) throw err;

          logger.debug(
            "Internal DHT ID: %s",
            multihashingAsync.multihash.toB58String(dhtId)
          );
          logger.debug("ID length: %s", dhtId.length);
          logger.debug(dhtId);
          logger.debug(
            "Internal DHT ID is displayed for debug pursposes, never reference by this ID"
          );
          logger.info("================================");
          logger.info("PUBLIC KEY");

          logger.info(
            cryptoUtil.keys
              .marshalPublicKey(node.peerInfo.id._pubKey, "secp256k1")
              .toString("base64")
          );

          if (myArgs.bootNodeAddr) {
            async.parallel(
              [
                (cb: () => void) =>
                  node.dial(new Multiaddr(myArgs.bootNodeAddr), cb),
                // Set up of the cons might take time
                (cb: () => void) => setTimeout(cb, 300)
              ],
              (err: Error | null | undefined) => {
                if (err) {
                  throw err;
                }
                logger.info("Connection Successful");

                if (myArgs.chatClient) {
                  const chatClient: CommandLineChat = new CommandLineChat(node);
                  chatClient.init();
                }
              }
            );
          }
        }
      );
    }
  );
}

mainProcess();
