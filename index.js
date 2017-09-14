'use strict';
const ElectrumClient = require('electrum-client')
const utxo = require('./utxo')


const main = async () => {
    const network = {'pubKeyHash': 0x00, 'scriptHash': 0x05}
    const ecl = new ElectrumClient(995, 'btc.smsys.me', 'tls')
    await ecl.connect()
    const x = await utxo(ecl, network, "1AEu3dt4ja4tSGBvDVLGtT4nUtyxr94tkp")
    console.log(x)
    await ecl.close()
}
main()
