const BTCpayKey = process.env.BTCpayKey
const BTCpayStore = process.env.BTCpayStore 
const axios = require("axios")
const mongoDBPassword = process.env.mongoDBPassword
const mongoServerLocation = process.env.mongoServerLocation
const { MongoClient, ServerApiVersion } = require('mongodb')
// const Joi = require("joi")
const crypto = require('crypto')
// const hri = require('human-readable-ids').hri
const uri = "mongodb+srv://main:" + mongoDBPassword + "@"+ mongoServerLocation + "/?retryWrites=true&w=majority"
const storeAddress = 'https://btcpay.anonshop.app/api/v1/stores/' + BTCpayStore + '/invoices/'
/* const fs = require('fs')
const path = require("path")
const pathWordlist = path.resolve(__dirname + "/bip39Wordlist.txt") */
// const words = fs.readFileSync(pathWordlist, 'utf8').toString().split("\n")
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 })
const collection = client.db("real").collection("orders")
exports.handler = async (event) => {
    try {
      const invoiceId = JSON.parse(event.body).invoiceId
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
    // less than 24 hours old
    if ((Date.now() - orderInfo.metadata.timestamp) > 86400000 || orderInfo.status !== 'Settled') {
      return {
        statusCode: 500,
        body: 'invoice is too old or not settled'
      }
    }
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
    delete orderInfo.storeId
    const docInfo = {
      passphrase: orderInfo.metadata.numberArray,
      allOrderInformation: {
        paymentInfo,
        orderInfo
      },
      customerChat: [],
      phoneMessages: []

    }
    const doc = docInfo
    await collection.insertOne(doc)
    return {
      statusCode: 200,
      body: ''
    }
    } catch (error) {
      console.log(error)
      return {
        statusCode: 500,
        body: ''
      }
    }

}
