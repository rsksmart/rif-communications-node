// Main process
/* eslint-disable @typescript-eslint/no-use-before-define */
import * as async from 'async'
import { createNode, createNodeFromPrivateKey } from './modules/createNode'
import cryptoUtil from 'libp2p-crypto'
import { multiaddrValidator, processBootnodes } from './modules/setup'
import multihashingAsync from 'multihashing-async'
import { myArgs, keystore } from './modules/nodesConf'
import { CommandLineChat } from './modules/chatClient'
import logger from './logger'
import { createInterface } from 'readline'
import DS from 'interface-datastore'

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
})

function mainProcess () {
  async.waterfall(
    [
      (cb: () => void) => {
        myArgs.createKey ? createNode(cb) : createNodeFromPrivateKey(cb)
      }
    ],
    (err: Error | null | undefined, node: any) => {
      if (err) throw err

      logger.info('==== YOUR NODE INFORMATION ====')
      logger.info('ID: %s', node.peerInfo.id._idB58String)
      logger.info('ID length: %s', node.peerInfo.id.id.length)
      logger.info('Multiaddresses:')
      node.peerInfo.multiaddrs.forEach((ma: { toString: () => string }) =>
        logger.info(ma.toString())
      )
      multihashingAsync.digest(
        node.peerInfo.id.id,
        'sha2-256',
        (err: Error, dhtId: any) => {
          if (err) throw err

          logger.debug(
            'Internal DHT ID: %s',
            multihashingAsync.multihash.toB58String(dhtId)
          )
          logger.debug('ID length: %s', dhtId.length)
          logger.debug(dhtId)
          logger.debug(
            'Internal DHT ID is displayed for debug pursposes, never reference by this ID'
          )
          logger.info('================================')
          logger.info('PUBLIC KEY')

          logger.info(
            cryptoUtil.keys
              .marshalPublicKey(node.peerInfo.id._pubKey, 'secp256k1')
              .toString('base64')
          )

          if (myArgs.bootNodeAddresses) {
            const bootnodeList: string[] = myArgs.bootNodeAddresses.map(bootnodeArg => bootnodeArg.toString())
            bootnodeList.forEach(bootnodeString => {
              if (!multiaddrValidator(bootnodeString)) {
                logger.error(`Invalid boootnode address ${bootnodeString}`)
                process.exit(-1)
              }
            })
            processBootnodes(node, bootnodeList).then(e => {
              if (myArgs.chatClient) {
                const chatClient: CommandLineChat = new CommandLineChat(node)
                chatClient.init()
              }
              logger.info('Connection Successful')
            }).catch(e => {
              logger.info('Connection Fail')
              process.exit(-1)
            })
          }
        }
      )
    }
  )
}

function askForPassword (): any {
  if (!myArgs.passphrase) {
    rl.question(
      myArgs.createKey
        ? 'Please enter a password to encrypt your key (or empty string if no encryption is required)'
        : 'Please enter the password to decrypt the key (or empty string if key is not encrypted)',
      password => {
        if (password === '') {
          logger.warn(
            myArgs.createKey
              ? 'Key will be stored in cleartext'
              : 'Key will be loaded as not encrypted'
          )
        }
        myArgs.passphrase = password
        mainProcess()
      }
    )
  } else {
    mainProcess()
  }
}

function askForKeyName (): any {
  if (!myArgs.keyname) {
    const text: string = myArgs.createKey
      ? 'Please enter the name of the new key to create: '
      : 'Please enter the name of the key to load from the keystore: '
    rl.question(text, async keyName => {
      const dbKey = new DS.Key('/privKeys/' + keyName)
      const exists = await keystore.has(dbKey)

      if (myArgs.createKey && exists) {
        logger.warn('A key with the same name aleady exists in the keyStore')
        askForKeyName()
      } else if (!myArgs.createKey && !exists) {
        logger.warn('The provided keyname does not exist in the keystore')
        askForKeyName()
      } else {
        myArgs.keyname = keyName
        askForPassword()
      }
    })
  } else {
    askForPassword()
  }
}

async function keystoreHasKeys (): Promise<boolean> {
  const queryResult = keystore.query({
    prefix: '/privKeys'
  })
  const iterator = queryResult[Symbol.asyncIterator]()

  if ((await iterator.next()).done) {
    return false
  } else {
    return true
  }
}

async function listExistingKeys (): Promise<void> {
  let list = ''
  const queryResult = keystore.query({ prefix: '/privKeys', keysOnly: true })
  for await (const value of queryResult) {
    list = list.concat(value.key.toString().replace('/privKeys/', '')) + '\r\n'
  }

  rl.write(list)
  askForCreateKey()
}

async function askForCreateKey () {
  if (myArgs.createKey == null) {
    const showListOption: boolean = await keystoreHasKeys()
    rl.question(
      'Select an option:\n [1] Create new Key' +
        (showListOption
          ? '\n [2] Load key from store\n [3] List existing keys\n '
          : ''),
      option => {
        if (option !== '1' && option !== '2' && option !== '3') {
          logger.warn('Incorrect option')
          askForCreateKey()
        } else {
          if (option === '1') {
            myArgs.createKey = option === '1'
            askForKeyName()
          } else if (showListOption) {
            if (option === '2') {
              askForKeyName()
            } else if (option === '3') {
              listExistingKeys()
            }
          } else {
            logger.warn('Incorrect option')
            askForCreateKey()
          }
        }
      }
    )
  } else {
    askForKeyName()
  }
}

process.on('unhandledRejection', (reason, p) => {
  logger.error('Unhandled Rejection at: Promise ', p, reason)
})

if (typeof require !== 'undefined' && require.main === module) {
  askForCreateKey()
}
