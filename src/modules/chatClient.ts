import { createInterface } from 'readline'
import { PeerIdWithIs, PeerId, createFromPubKey } from 'peer-id'
import Libp2p from 'libp2p'
import { myArgs } from './nodesConf'
import logger from '../logger'

const enterPubKeyStr = "Enter the contact's public key"
const enterMsg = 'Enter your message'
const exit = '/exit'
const sessionLost = 'Session with chat lost'
const msgWaitToken = '.'
const unknownContact = 'The selected user is not a known contact'

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
      if (err) throw err

      this.startChat(contact)
    })
  }

  addContact (callback: (arg0: null, arg1: any) => void) {
    this.rl.question(enterPubKeyStr, publicKey => {
      createFromPubKey(publicKey, (err: Error, pId: PeerId) => {
        if (err) throw err

        this.activeContacts.set(pId.toB58String(), pId)

        callback(null, pId.toB58String())
      })
    })
  }

  startChat (contact: string) {
    if (!this.activeContacts.has(contact)) {
      logger.warn(unknownContact)
      return
    }
    const pId: PeerId | undefined = this.activeContacts.get(contact)

    const msgNonce: number = this.activeChats.has(contact)
      ? this.activeChats.get(contact)
      : 0

    this.rl.question(enterMsg, message => {
      if (message !== exit) {
        this.activeChats.set(contact, msgNonce + 1)

        this.clientNode.dht.sendMessage(
          pId,
          message,
          msgNonce,
          myArgs.ofuscate,
          (err: Error) => {
            if (err) {
              logger.error(err)
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
      logger.error(sessionLost)
      return
    }

    this.rl.question(msgWaitToken, message => {
      if (message !== exit) {
        const msgNonce = this.activeChats.get(peerIdString)
        this.activeChats.set(peerIdString, msgNonce + 1)

        this.clientNode.dht.sendMessage(
          this.activeContacts.get(peerIdString),
          message,
          msgNonce,
          myArgs.ofuscate,
          (err: Error) => {
            if (err) {
              logger.error(err)
            } else {
              this.processNewChatLine(peerIdString)
            }
          }
        )
      }
    })
  }
}
