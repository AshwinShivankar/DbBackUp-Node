const express = require("express");
const http = require("http");
const cronJobs = require("./BackUp/cronJobs");

const app = express();

//AWS SDK for JavaScript (v3)
require("aws-sdk/lib/maintenance_mode_message").suppress = true;

const main = async () => {
  try {
    const PORT = process.env.PORT || 8080;
    let httpServer = http.createServer(app);

    httpServer.listen(PORT); //Listen to express server
  } catch (err) {
    console.log("Error starting the server:", err);
    return process.exit(1);
  }
};
main();
