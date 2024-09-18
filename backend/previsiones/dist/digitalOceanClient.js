"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.s3ClientPrevisiones = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const config_1 = require("./config/config");
const spacesEndpoint = "https://nyc3.digitaloceanspaces.com";
const s3ClientPrevisiones = new client_s3_1.S3Client({
    endpoint: spacesEndpoint,
    region: "us-east-1",
    credentials: {
        accessKeyId: config_1.config.digitalOceanAccessKey ?? "",
        secretAccessKey: config_1.config.digitalOceanSecretKey ?? "",
    },
});
exports.s3ClientPrevisiones = s3ClientPrevisiones;
//# sourceMappingURL=digitalOceanClient.js.map