import { createInterface } from 'readline'
import { PeerIdWithIs, PeerId, createFromPubKey } from 'peer-id'
import Libp2p from 'libp2p'
import { myArgs } from './nodesConf'

const enter_pub_key_str = "Enter the contact's public key"
const enter_msg = 'Enter your message'
const exit = '/exit'
const session_lost = 'Session with chat lost'
const msg_wait_token = '.'
const unknown_contact = 'The selected user is not a known contact'

export class CommandLineChat {
  activeContacts: Map<string, PeerId>;
  activeChats: Map<any, any>;
  clientNode: Libp2p;

  rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  constructor (node: Libp2p) {
    this.activeContacts = new Map()
    this.activeChats = new Map()
    this.clientNode = node
  }

  // Easy way to start a chat with a single contact
  init () {
    this.addContact((err, contact) => {
      this.startChat(contact)
    })
  }

  addContact (callback: (arg0: null, arg1: any) => void) {
    this.rl.question(enter_pub_key_str, publicKey => {
      createFromPubKey(publicKey, (err: Error, pId: PeerId) => {
        if (err == undefined) {
          this.activeContacts.set(pId.toB58String(), pId)
        }
        callback(null, pId.toB58String())
      })
    })
  }

  startChat (contact: string) {
    if (!this.activeContacts.has(contact)) {
      console.warn(unknown_contact)
      return
    }
    const pId: PeerId | undefined = this.activeContacts.get(contact)

    const msgNonce: number = this.activeChats.has(contact)
      ? this.activeChats.get(contact)
      : 0

    this.rl.question(enter_msg, message => {
      if (message != exit) {
        this.activeChats.set(contact, msgNonce + 1)

        this.clientNode.dht.sendMessage(
          pId,
          message,
          msgNonce,
          myArgs.ofuscate,
          (err: Error) => {
            if (err) {
              console.log(err)
            } else {
              this.processNewChatLine(contact)
            }
          }
        )
      }
    })
  }

  private processNewChatLine (peerIdString: string) {
    if (
      !this.activeContacts.has(peerIdString) ||
      !this.activeChats.has(peerIdString)
    ) {
      console.error(session_lost)
      return
    }

    this.rl.question(msg_wait_token, message => {
      if (message != exit) {
        const msgNonce = this.activeChats.get(peerIdString)
        this.activeChats.set(peerIdString, msgNonce + 1)

        this.clientNode.dht.sendMessage(
          this.activeContacts.get(peerIdString),
          message,
          msgNonce,
          myArgs.ofuscate,
          (err: Error) => {
            if (err) {
              console.log(err)
            } else {
              this.processNewChatLine(peerIdString)
            }
          }
        )
      }
    })
  }
}
