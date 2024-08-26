const S3 = require("@aws-sdk/client-s3");
const config = require("./config/config");
const spacesEndpoint = "https://nyc3.digitaloceanspaces.com";

const s3ClientPrevisiones = new S3({
  endpoint: spacesEndpoint,
  region: "us-east-1",
  credentials: {
    accessKeyId: config.digitalOceanAccessKey,
    secretAccessKey: config.digitalOceanSecretKey,
  },
});

module.exports = {
  s3ClientPrevisiones,
};
