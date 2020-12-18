const env = require("../../../environment")
const AWS = require("aws-sdk")
const {
  deployToObjectStore,
  performReplication,
  fetchCredentials,
} = require("./utils")
const {
  getWorkerUrl,
  getCouchUrl,
  getMinioUrl,
} = require("../../../utilities/builder/hosting")

exports.preDeployment = async function() {
  const url = `${await getWorkerUrl()}/api/deploy`
  const json = await fetchCredentials(url, {
    apiKey: env.BUDIBASE_API_KEY,
  })

  // response contains:
  // couchDbSession, bucket, objectStoreSession

  // set credentials here, means any time we're verified we're ready to go
  if (json.objectStoreSession) {
    AWS.config.update({
      accessKeyId: json.objectStoreSession.accessKeyId,
      secretAccessKey: json.objectStoreSession.secretAccessKey,
    })
  }

  return json
}

exports.postDeployment = async function() {
  // we don't actively need to do anything after deployment in self hosting
}

exports.deploy = async function(deployment) {
  const appId = deployment.getAppId()
  const verification = deployment.getVerification()
  const objClient = new AWS.S3({
    endpoint: await getMinioUrl(),
    s3ForcePathStyle: true, // needed with minio?
    signatureVersion: "v4",
    params: {
      Bucket: verification.bucket,
    },
  })
  // no metadata, aws has account ID in metadata
  const metadata = {}
  await deployToObjectStore(appId, objClient, metadata)
}

exports.replicateDb = async function(deployment) {
  const appId = deployment.getAppId()
  const verification = deployment.getVerification()
  return performReplication(
    appId,
    verification.couchDbSession,
    await getCouchUrl()
  )
}
