require("dotenv").config();

const express = require("express");
const httpProxy = require("http-proxy");

const app = express();
const PORT = process.env.S3_REVERSE_PROXY_PORT || 8000;
const S3_OUTPUT_BASE_PATH = process.env.S3_OUTPUT_BASE_PATH;

const proxy = httpProxy.createProxy();

app.use((req, res) => {
  const hostname = req.hostname;
  const subdomain = hostname.split(".")[0];

  const resolvesTo = `${S3_OUTPUT_BASE_PATH}/${subdomain}`;

  return proxy.web(req, res, { target: resolvesTo, changeOrigin: true });
});

proxy.on("proxyReq", (proxyReq, req, res) => {
  const url = req.url;
  if (url === "/") proxyReq.path += "index.html";
});

app.listen(PORT, () => console.log(`Reverse Proxy Running on port ${PORT}`));
