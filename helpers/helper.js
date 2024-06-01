const HttpError = require("../modals/HttpError");
const Bucket = process.env.S3_BUCKET;
const AWS = require("aws-sdk");
const s3 = new AWS.S3({
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  endpoint: "s3-ap-south-1.amazonaws.com",
  signatureVersion: "v4",
  region: "ap-south-1",
});
const fs = require("fs");
const path = require("path");

async function uploadBackup(filename) {
  if (filename) {
    return new Promise((resolve, reject) => {
      const Key = filename;

      const Body = fs.readFileSync(path.join("uploads", filename));
      //s3 upload
      s3.upload({ Bucket, Key, Body, ContentType: filename }, (err, data) => {
        if (err) {
          const error = new HttpError(
            500,
            "Error uploading file",
            HttpError.SAME
          );
          fs.unlinkSync(path.join("uploads", filename));
          reject(error);
          return;
        } else {
          fs.unlinkSync(path.join("uploads", filename));
          console.log("Done");
          return;
        }
      });
    });
  }
}

exports.uploadBackup = uploadBackup;
