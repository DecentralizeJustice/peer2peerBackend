const BTCpayKey = process.env.BTCpayKey
const BTCpayStore = process.env.BTCpayStore 
const axios = require("axios")
const mongoDBPassword = process.env.mongoDBPassword
const mongoServerLocation = process.env.mongoServerLocation
const { MongoClient, ServerApiVersion } = require('mongodb')
const hri = require('human-readable-ids').hri
const uri = "mongodb+srv://main:" + mongoDBPassword + "@"+ mongoServerLocation + "/?retryWrites=true&w=majority"
const storeAddress = 'https://btcpay.anonshop.app/api/v1/stores/' + BTCpayStore + '/invoices/'
//const fs = require('fs')
//const path = require("path")
//const pathWordlist = path.resolve(__dirname + "/bip39Wordlist.txt")
//const words = fs.readFileSync(pathWordlist, 'utf8').toString().split("\n")
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 })
const collection = client.db("orders").collection("genOrders")

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
    if ((Date.now() - Number(orderInfo.metadata.timestamp)) > 86400000 || orderInfo.status !== 'Settled') { //  
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
      sender: 'Admin DGoon',
      timestamp: Date.now(),
      message: `Hi Shopper! Your order is waiting for an earner to pick it up.
      You can send me a message here if you have any questions or need to change your order. 
      You should check on your order once every 3 days.
      You can bookmark this page to check on your order later.`
    }

    const docInfo = {
      metaData: {
        type: 'giftregistry',
        currency: 'xmr',
        status: ['pending earner pickup'],
        shopperPassphrase: orderInfo.metadata.info.passphraseArray.toString()
      }
      orderDetails: {
        orderId: hri.random() +'-'+ hri.random(),
        invoiceId: invoiceId,
        allOrderInformation: {
          paymentInfo,
          orderInfo
        }
      },
      chats: {
        shopperChat: [ firstMessage ],
        earnerChat: [],
        everyoneChat: []
      }
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


/* function getCheckOrderLink(numberArray){
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
} */