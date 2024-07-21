require("dotenv").config({ path: "../.env" });
const express = require("express");
const cors = require("cors");
const { generateSlug } = require("random-word-slugs");
const { ECSClient, RunTaskCommand } = require("@aws-sdk/client-ecs");
const Redis = require("ioredis");

const app = express();
const PORT = process.env.API_SERVER_PORT || 9000;

app.use(cors({ origin: process.env.FRONTEND_ORIGIN }));

const redisUrl = process.env.REDIS_URL;
const subscriber = new Redis(redisUrl);

const ecsClient = new ECSClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const config = {
  CLUSTER: process.env.ECS_CLUSTER,
  TASK: process.env.ECS_TASK,
};

app.use(express.json());

const s3ReverseProxyOrigin = s3ReverseProxyOrigin.replace(/^https?:\/\//, "");
const previewURL = `http://${projectSlug}.${s3ReverseProxyOrigin}`;

app.post("/project", async (req, res) => {
  try {
    const { gitURL, slug } = req.body;
    const projectSlug = slug || generateSlug();

    const command = new RunTaskCommand({
      cluster: config.CLUSTER,
      taskDefinition: config.TASK,
      launchType: "FARGATE",
      count: 1,
      networkConfiguration: {
        awsvpcConfiguration: {
          assignPublicIp: "ENABLED",
          subnets: process.env.SUBNETS.split(","),
          securityGroups: [process.env.SECURITY_GROUPS],
        },
      },
      overrides: {
        containerOverrides: [
          {
            name: process.env.ECS_TASK_DEFINITION_IMAGE,
            environment: [
              { name: "GIT_REPOSITORY__URL", value: gitURL },
              { name: "PROJECT_ID", value: projectSlug },
            ],
          },
        ],
      },
    });

    await ecsClient.send(command);

    return res.json({
      status: "queued",
      data: { projectSlug, previewURL },
    });
  } catch (error) {
    console.error("Error in /project endpoint:", error);
    return res
      .status(500)
      .json({ status: "error", message: "Internal Server Error" });
  }
});

async function initRedisSubscribe() {
  console.log("Subscribed to logs....");
  subscriber.psubscribe("logs:*");

  subscriber.on("pmessage", async (pattern, channel, message) => {
    const redisMessage = { channel, message };
    const fetch = await import("node-fetch").then((module) => module.default);
    fetch(`${process.env.SOCKET_SERVER_ORIGIN}/redis-message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(redisMessage),
    });
  });
}

initRedisSubscribe();

app.listen(PORT, () => console.log(`API Server running on port ${PORT}`));
