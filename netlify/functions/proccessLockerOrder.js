const BTCpayKey = process.env.BTCpayKey
const BTCpayStore = process.env.BTCpayStore 
const axios = require("axios")
const mongoDBPassword = process.env.mongoDBPassword
const mongoServerLocation = process.env.mongoServerLocation
const { MongoClient, ServerApiVersion } = require('mongodb')
const hri = require('human-readable-ids').hri
const uri = "mongodb+srv://main:" + mongoDBPassword + "@"+ mongoServerLocation + "/?retryWrites=true&w=majority"
const storeAddress = 'https://btcpay.anonshop.app/api/v1/stores/' + BTCpayStore + '/invoices/'
const fs = require('fs')
const path = require("path")
const pathWordlist = path.resolve(__dirname + "/bip39Wordlist.txt")
const words = fs.readFileSync(pathWordlist, 'utf8').toString().split("\n")
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 })
const collection = client.db("orders").collection("lockerOrders")

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
    if ((Date.now() - Number(orderInfo.metadata.timestamp)) > 86400000 || orderInfo.status !== 'Settled') {
      console.log('invoice is too old or not settled')
      return {
        statusCode: 500,
        body: ''
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
    await delete orderInfo.storeId
    const exist = await collection.findOne( { invoiceId: invoiceId })
    if(exist !== null){
      console.log('error: "invoice already exist"')
      return {statusCode: 500, body: '' }
    }

    const firstMessage = {
      sender: 'dgoon',
      timestamp: Date.now(),
      message: `Hi Friend.  I will approve your order within 24 hours and it will go to our orderbook. 
      You can send me a message here if you have any questions or need to change your order. 
      You also must check on your order every other day.
      You can check on your order using this link: ` + getCheckOrderLink(orderInfo.metadata.info.passphraseArray)
    }

    const docInfo = {
      orderId: hri.random(),
      invoiceId: invoiceId,
      shopperPassphrase: orderInfo.metadata.info.passphraseArray.toString(),
      allOrderInformation: {
        paymentInfo,
        orderInfo
      },
      status: ['pending approval'],
      shopperChat: [ firstMessage ],
    }
    await collection.insertOne(docInfo)
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


function getCheckOrderLink(numberArray){
  const wordListFinal = numberArrayToWordArray(numberArray)
  const link = 'https://peer.anonshop.app/login#' + wordListFinal.join(',')
  return link
}
function numberArrayToWordArray (numberArray) {
  const wordArray = []
  const splitNumberArray = numberArray
  const length = splitNumberArray.length
  for (var i=0;i<length; i++) {
    const wordToAdd = words[splitNumberArray[i]]
    wordArray.push(wordToAdd.replace(/(\r\n|\n|\r)/gm, ""))
  }
  return wordArray
}