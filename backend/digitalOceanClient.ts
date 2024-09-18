import { S3Client } from "@aws-sdk/client-s3";
import { config } from "./config/config";

const spacesEndpoint = "https://nyc3.digitaloceanspaces.com";

const s3ClientPrevisiones = new S3Client({
  endpoint: spacesEndpoint,
  region: "us-east-1",
  credentials: {
    accessKeyId: config.digitalOceanAccessKey ?? "",
    secretAccessKey: config.digitalOceanSecretKey ?? "",
  },
});

export { s3ClientPrevisiones };
