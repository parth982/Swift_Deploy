require("dotenv").config();
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const mime = require("mime-types");
const Redis = require("ioredis");

const publisher = new Redis(process.env.REDIS_URL);

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// We get this from ENV as set of ECS in API-server.
const PROJECT_ID = process.env.PROJECT_ID;

function publishLog(log) {
  publisher.publish(`logs:${PROJECT_ID}`, JSON.stringify({ log }));
}

async function init() {
  console.log("Executing script.js");
  publishLog("Build Started...");
  const outDirPath = path.join(__dirname, "output");

  const p = exec(`cd ${outDirPath} && npm install && npm run build`);

  p.stdout.on("data", function (data) {
    console.log(data.toString());
    publishLog(data.toString());
  });

  p.stderr.on("data", function (data) {
    console.log("Error", data.toString());
    publishLog(`error: ${data.toString()}`);
  });

  p.on("close", async function () {
    console.log("Build Complete");
    publishLog(`Build Complete`);
    const distFolderPath = path.join(__dirname, "output", "dist");
    const distFolderContents = fs.readdirSync(distFolderPath, {
      withFileTypes: true,
    });

    publishLog(`Starting to upload`);
    for (const entry of distFolderContents) {
      const filePath = path.join(distFolderPath, entry.name);
      if (entry.isDirectory()) continue;

      console.log("uploading", filePath);
      publishLog(`uploading ${entry.name}`);

      const command = new PutObjectCommand({
        // No need to use ENV as pushed a image to ECR
        Bucket: process.env.S3_BUCKET || "swift-deploy-build-output",
        Key: `__outputs/${PROJECT_ID}/${entry.name}`,
        Body: fs.createReadStream(filePath),
        ContentType: mime.lookup(filePath),
      });

      await s3Client.send(command);
      publishLog(`uploaded ${entry.name}`);
      console.log("uploaded", filePath);
    }
    publishLog(`Done`);
    console.log("Done...");
  });
}

init();
