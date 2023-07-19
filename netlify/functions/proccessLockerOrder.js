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
const fs = require('fs')
const path = require("path")
const pathWordlist = path.resolve(__dirname + "/bip39Wordlist.txt")
const words = fs.readFileSync(pathWordlist, 'utf8').toString().split("\n")
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
    console.log(orderInfo)
    // less than 24 hours old
/*     if ((Date.now() - orderInfo.metadata.timestamp) > 86400000 || orderInfo.status !== 'Settled') {
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

    if (orderInfo.metadata.purchase.serviceType === '1service') {
      await process1Service(orderInfo, paymentInfo)
      return {
        statusCode: 200,
        body: ''
      }
    }
    
    if (orderInfo.metadata.purchase.serviceType === '1month') {
      await process1month(orderInfo, paymentInfo)
      return {
        statusCode: 200,
        body: ''
      }
    } */
    
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
async function process1month(orderInfo, paymentInfo) {
  const exist = await collection.findOne( { passphrase: orderInfo.metadata.numberArray })
  if(exist !== null){
    console.log('error: "account already exist"')
    return {statusCode: 500, body: 'account already exist' }
  }

  const firstMessage = {
    sender: 'dgoon',
    timestamp: Date.now(),
    message: `Hi Friend. I have to configure your monthly rental. This configuration can take up to 24 hours. 
    If you want a longer rental let me know here. If you want to renew your rental, shoot me a message her 5 days before your rental is up.
    Message me here if you have any questions! You can also check on your order here: `+ getCheckOrderLink(orderInfo.metadata.numberArray)
  }
  const docInfo = {
    passphrase: orderInfo.metadata.numberArray,
    allOrderInformation: {
      paymentInfo,
      orderInfo
    },
    customerChat: [ firstMessage ]
  }
  const doc = docInfo
  await collection.insertOne(doc)
  return true
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
    if (phone.sim1.phoneNumber.length > 3 && !phone.sim1.usedServices.includes(chosenService) && !phone.sim1.usedServices.includes("all")) {
      chosenPhone = { sim: 'sim1', phoneName: phone.phone }
    }
    if (phone.sim2.phoneNumber.length > 3 && !phone.sim2.usedServices.includes(chosenService) && !phone.sim2.usedServices.includes("all")) {
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
    me a message here. You can also check on your order here: ` + getCheckOrderLink(orderInfo.metadata.numberArray)
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
function getCheckOrderLink(numberArray){
  const wordListFinal = numberArrayToWordArray(numberArray)
  const link = 'https://phantomphone.app/login#' + wordListFinal.join(',')
  return link
}
function numberArrayToWordArray (numberArray) {
  const wordArray = []
  const splitNumberArray = numberArray.split(",")
  const length = splitNumberArray.length
  for (var i=0;i<length; i++) {
    const wordToAdd = words[splitNumberArray[i]]
    wordArray.push(wordToAdd.replace(/(\r\n|\n|\r)/gm, ""))
  }
  return wordArray
}