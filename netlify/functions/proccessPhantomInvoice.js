const BTCpayKey = process.env.BTCpayKey
const BTCpayStore = process.env.BTCpayStore 
const axios = require("axios")
// const mongoDBPassword = process.env.mongoDBPassword
//const mongoServerLocation = process.env.mongoServerLocation
// const { MongoClient, ServerApiVersion } = require('mongodb')
const Joi = require("joi")
const crypto = require('crypto');
const hri = require('human-readable-ids').hri
// const uri = "mongodb+srv://main:" + mongoDBPassword + "@"+ mongoServerLocation + "/?retryWrites=true&w=majority"
const storeAddress = 'https://btcpay.anonshop.app/api/v1/stores/' + BTCpayStore + '/invoices/'
const fs = require('fs')
const path = require("path")
const pathWordlist = path.resolve(__dirname + "/bip39Wordlist.txt")
const words = fs.readFileSync(pathWordlist, 'utf8').toString().split("\n")
// const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 })
exports.handler = async (event) => {
    try {
      const params = JSON.parse(event.body)
      const invoiceId = params.invoiceId
      const infoRequest = await axios.get(
        storeAddress + invoiceId,
        {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': BTCpayKey
            }
        }
      ) 
    const orderInfo = infoRequest.data
    console.log(orderInfo)
    // less than 24 hours old
    console.log((Date.now() - orderInfo.metadata.timestamp) > 86400000)
    const paymentRequest = await axios.get(
      storeAddress + invoiceId + `/payment-methods`,
      {
          headers: {
              'Content-Type': 'application/json',
              'Authorization': BTCpayKey
          }
      }
    ) 
    const paymentInfo = paymentRequest.data
    console.log(paymentInfo)
    return {
      statusCode: 200,
      body: ''
    }
    } catch (error) {
      console.log(error)
      console.log(BTCpayKey)
      console.log(BTCpayStore)
      return {
        statusCode: 500,
        body: ''
      }
    }

}
