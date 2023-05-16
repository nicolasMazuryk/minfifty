// zip -r aws-lambda-cloudwatch-errors-slack-notification.zip .

const axios = require('axios');
const zlib = require('zlib');

const awsEncode = text => encodeURIComponent(encodeURIComponent(text)).replace(/%/g, '$')

const decryptCloudwatchGzip = (cloudWatchLog) => {
  const buffer = Buffer.from(cloudWatchLog, 'base64');

  return new Promise((resolve, reject) => {
    zlib.unzip(buffer, (err, unzipped) => {
      if (err) reject(err)

      const { logGroup, logStream, logEvents } = JSON.parse(unzipped)
      const messages = []
      const cloudWatchUrl = `https://eu-central-1.console.aws.amazon.com/cloudwatch/home?region=eu-central-1#logsV2:log-groups/log-group/${awsEncode(logGroup)}/log-events/${awsEncode(logStream)}`

      logEvents.forEach(logEvent => {
        if (logEvent.message.toLowerCase().includes('error')){
          messages.push(logEvent.message)
        }
      })

      resolve({
        messages: messages,
        url: cloudWatchUrl,
      });
    });
  })
}

module.exports.handler = async(event, context) => {
  const errorLogs = await decryptCloudwatchGzip(event.awslogs.data)

  const text = `<${errorLogs.url}|CloudWatch Logs>\n\n ${errorLogs.messages.join('\n')}`

  await axios({
    url: process.env.SLACK_WEBHOOK_URL,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    data: { text },
  })

  return { statusCode: 200 }
}
