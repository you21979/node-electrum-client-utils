'use strict';
const task = require('promise-util-task')
const TxDecoder = require('bitcoin-txdecoder')
const ElectrumClient = require('electrum-client')

const getTransaction = (cli, network, txid) => {
    return cli.blockchainTransaction_get(txid).then( rawtx => {
        const txd = new TxDecoder(rawtx, network)
        return txd.toObject()
    })
}

const getUnconfirmedTransactions = (cli, network, address) => {
    return cli.blockchainAddress_getMempool(address).then(list => {
        const tasklist = list.map( v => {
            return () => getTransaction(cli, network, v.tx_hash)
        })
        return task.seq(tasklist)
    })
}

const getUnspentTransactions = (cli, network, address) => {
    return cli.blockchainAddress_listunspent(address).then(list => {
        const tasklist = list.map( v => {
            return () => getTransaction(cli, network, v.tx_hash)
        })
        return task.seq(tasklist)
    })
}

const main = async () => {
    const ecl = new ElectrumClient(995, 'btc.smsys.me', 'tls')
    await ecl.connect()
//    const x = await getTransaction(ecl, {'pubKeyHash': 0x00, 'scriptHash': 0x05}, "9e952b626d9fba82ed3e2ab0268e11ad115aaa7e373ebf5476210b6eddbb865f")
//    const x = await getUnconfirmedTransactions(ecl, {'pubKeyHash': 0x00, 'scriptHash': 0x05}, "3Q73NkkN919WJzwDMQMbUpKkqYFtJzTAUC")
    const x = await getUnspentTransactions(ecl, {'pubKeyHash': 0x00, 'scriptHash': 0x05}, "3Q73NkkN919WJzwDMQMbUpKkqYFtJzTAUC")
    console.log(x)
    await ecl.close()
}
main()
