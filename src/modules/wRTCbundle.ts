// WebRTC Bundle

import KadDHT from "libp2p-kad-dht";
import Mplex from "libp2p-mplex";
import SECIO from "libp2p-secio";
import WS from "libp2p-websockets";
import Wstar from "libp2p-webrtc-star";
// import { defaultsDeep } from '@nodeutils/defaults-deep'
import libp2p from "libp2p";
import wrtc from "wrtc";

const upgrader = {
  upgradeInbound: (maConn: () => {}) => maConn,
  upgradeOutbound: (maConn: () => {}) => maConn
};
const ws = new WS({ upgrader });

class WebSocketBundle extends libp2p {
  constructor(_options: any) {
    const defaults = {
      modules: {
        transport: [ws],
        streamMuxer: [Mplex], // Stream multiplexer, we can dial several times to a node and we'll only have one connection with the different
        connEncryption: [SECIO], // TLS 1.3 "like" crypto channel, hasn't been audited yet, libp2p will
        dht: KadDHT // This also resolves Peer discovery (routing) via serendipity (Random Walk on the DHT)
      },
      config: {
        dht: {
          enabled: true,
          kBucketSize: 20
        },
        peerDiscovery: {
          autoDial: false,
          webRTCStar: {
            enabled: false
          }
        }
      }
    };

    super({ ..._options, ...defaults });
  }
}

class WebRTCBundle extends libp2p {
  constructor(_options: any) {
    const wrtcStar = new Wstar({ wrtc: wrtc });

    const defaults = {
      modules: {
        transport: [ws, wrtcStar],
        streamMuxer: [Mplex], // Stream multiplexer, we can dial several times to a node and we'll only have one connection with the different
        // protocols being multiplexed, it should also be a bidirectional connection
        connEncryption: [SECIO], // TLS 1.3 "like" crypto channel, hasn't been audited yet, libp2p will
        // eventually move to true TLS 1.3 once the spec is finalized and an implementation available
        // we add the DHT module that will enable Peer and Content Routing
        // The connection will present a crypto challenge to the user to prove that it owns the private key
        // Corresponding to the peerID (H(PublicKey)) of the multiaddress
        // More info about secio: https://github.com/auditdrivencrypto/secure-channel/blob/master/prior-art.md#ipfss-secure-channel
        // peerDiscovery: [wrtcStar.discovery],
        dht: KadDHT // This also resolves Peer discovery (routing) via serendipity (Random Walk on the DHT)
      },
      config: {
        dht: {
          enabled: true,
          kBucketSize: 20
        },
        // Not needed to make explicit, but we can put webrtc discovery as disabled
        peerDiscovery: {
          autoDial: false,
          webRTCStar: {
            enabled: false
          }
        }

        /// /Enable once the list of bootstrapers contains actual bootstrap nodes
        // If you want to use automatic bootnode connection, then add the code in
        // https://github.com/libp2p/js-libp2p/tree/master/examples/discovery-mechanisms
      }
    };

    super({ ..._options, ...defaults });
  }
}

class WebRTCDirectBundle extends libp2p {
  constructor(_options) {
    //const wrtcStar = new WStar();
    const webRTCDirect = new WebRTCDirect();

    const defaults = {
      modules: {
        transport: [ws, webRTCDirect],
        streamMuxer: [Mplex], //Stream multiplexer, we can dial several times to a node and we'll only have one connection with the different
        //protocols being multiplexed, it should also be a bidirectional connection
        connEncryption: [SECIO], //TLS 1.3 "like" crypto channel, hasn't been audited yet, libp2p will
        //eventually move to true TLS 1.3 once the spec is finalized and an implementation available
        // we add the DHT module that will enable Peer and Content Routing
        //The connection will present a crypto challenge to the user to prove that it owns the private key
        //Corresponding to the peerID (H(PublicKey)) of the multiaddress
        //More info about secio: https://github.com/auditdrivencrypto/secure-channel/blob/master/prior-art.md#ipfss-secure-channel
        //peerDiscovery: [Bootstrap],
        dht: KadDHT // This also resolves Peer discovery (routing) via serendipity (Random Walk on the DHT)
      },
      config: {
        peerDiscovery: {
          autoDial: false
          /*bootstrap: {
            interval: 20e3,
            enabled: false,
            list: bootstrapList
          }*/
        },
        dht: {
          enabled: true,
          kBucketSize: 20
        }
      }
    };
    super(defaultsDeep(_options, defaults));
  }
}
export { WebRTCBundle, WebSocketBundle };
