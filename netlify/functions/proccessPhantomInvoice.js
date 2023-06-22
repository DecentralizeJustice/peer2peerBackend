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
const allPhoneInfo = client.db("real").collection("phonesInfo")
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
    console.log(orderInfo)
    // await process1Service(orderInfo, paymentInfo)
    
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
async function process1Service(orderInfo, paymentInfo) {
  const exist = await collection.findOne( { passphrase: orderInfo.metadata.numberArray })
  if(exist !== null){
    console.log('error: "account already exist"')
    return {statusCode: 500, body: 'account already exist' }
  }
  const phoneInfoCollection = await allPhoneInfo.find().toArray()
  let chosenPhone = ''
  const chosenService = orderInfo.metadata.purchase.service
  for (let phone of phoneInfoCollection) {
    if (!phone.sim1.usedServices.includes(chosenService) && !phone.sim1.usedServices.includes("all") && phone.sim1.phoneNumber !== "") {
      chosenPhone = { sim: 'sim1', phoneName: phone.phone }
    }
    if (!phone.sim2.usedServices.includes(chosenService) && !phone.sim2.usedServices.includes("all") && phone.sim2.phoneNumber !== "") {
      chosenPhone = { sim: 'sim2', phoneName: phone.phone }
    }
  }
  if (chosenPhone === '') {
    throw new Error('no service available');
  }
  if (chosenPhone.sim === 'sim1') {
    await allPhoneInfo.updateOne( { "phone" : chosenPhone.phoneName }, { $push: { 'sim1.usedServices' : chosenService } })
  } else {
    await allPhoneInfo.updateOne( { "phone" : chosenPhone.phoneName }, { $push: { 'sim2.usedServices' : chosenService } })
  }

  const firstMessage = {
    sender: 'dgoon',
    timestamp: Date.now(),
    message: `Hi Friend. You should see the number for your service rental to the right. If you have any questions or need anything, shoot 
    me a message here.`
  }
  const docInfo = {
    passphrase: orderInfo.metadata.numberArray,
    allOrderInformation: {
      paymentInfo,
      orderInfo
    },
    customerChat: [ firstMessage ],
    chosenPhone

  }
  const doc = docInfo
  await collection.insertOne(doc)
  return true
}