'use strict';
const task = require('promise-util-task')
const TxDecoder = require('bitcoin-txdecoder')
const ElectrumClient = require('electrum-client')

const mapPayment = (tx, vout, height, blockheight) => ({
    txid: tx.format.txid,
    vout: vout,
    amount: parseFloat(tx.outputs[vout].value),
    satoshis: tx.outputs[vout].satoshi,
    address: tx.outputs[vout].scriptPubKey.addresses[0],
    type: tx.outputs[vout].scriptPubKey.type,
    scriptPubKey: tx.outputs[vout].scriptPubKey.hex,
    height: height,
    confirmations: blockheight - height + 1,
    inputs: tx.inputs.map( i => [i.txid, i.n].join(':') ).join(','),
})

const getTransaction = (cli, network, txid) => {
    return cli.blockchainTransaction_get(txid).then( rawtx => {
        const txd = new TxDecoder(rawtx, network)
        return txd.toObject()
    })
}

const getMempoolTransactions = (cli, network, address) => {
    return cli.blockchainAddress_getMempool(address).then(list => {
        const tasklist = list.map( v => {
            return () => getTransaction(cli, network, v.tx_hash).then(tx => {
                return tx.outputs.filter( output => {
                    return output.scriptPubKey.addresses.includes(address)
                }).map( output => {
                    return mapPayment(tx, output.n, -1, -2)
                })
            })
        })
        return task.all(tasklist).then(res => {
            return res.reduce( (r,v) => { v.forEach(x => r.push(x)); return r }, [])
        })
    })
}

const getUnspentTransactions = (cli, network, address, blockheight) => {
    return cli.blockchainAddress_listunspent(address).then(list => {
        const tasklist = list.map( v => {
            return () => getTransaction(cli, network, v.tx_hash).then(tx => mapPayment(tx, v.tx_pos, v.height, blockheight))
        })
        return task.all(tasklist)
    })
}

// 自分のアドレス以外に全額支払った場合、支払い済みにならない
const getMempoolUnspentTransactions = (cli, network, address) => {
    return getMempoolTransactions(cli, network, address).then( txs => {
        const list = txs.map( tx => tx.inputs ).join(',').split(',')
        const f = txs.filter( tx => {
            const id = [tx.txid, tx.vout].join(':')
            return !list.includes(id)
        })
        return f
    })
}

const getUTXO = (cli, network, address) => {
    return cli.blockchainNumblocks_subscribe().then( blockheight => {
        return task.all([
            () => getUnspentTransactions( cli, network, address, blockheight ),
            () => getMempoolUnspentTransactions(cli, network, address)
        ]).then( res => {
            return [].concat(res[0], res[1])
        })
    })
}

module.exports = getUTXO
