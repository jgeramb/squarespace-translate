const fs = require("fs");
const env = require("dotenv").config().parsed;
const spdy = require("spdy");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const port = parseInt(env.PORT) || 8080;
const app = express();

app.use(
  cors({
    origin: "*",
    methods: "GET,POST,DELETE,PUT,PATCH",
    allowedHeaders: "Content-Type"
  })
);

// initialize routes
const routes = require("./routes");

const sendJsonHeaders = (response) => {
  response.header("Content-Type", "application/json; charset=utf-8");
};
const handle = async (request, response, route) => {
  sendJsonHeaders(response);
  response.send(JSON.stringify(await route.handleRequest(request), null, 2));
};

// register routes
const jsonParser = bodyParser.json();
routes.forEach((route) => {
  switch (route.getMethod()) {
    case "POST":
      app.post(route.getPath(), jsonParser, async (request, response) => await handle(request, response, route));
      break;
    case "DELETE":
      app.delete(route.getPath(), jsonParser, async (request, response) => await handle(request, response, route));
      break;
    case "PUT":
      app.put(route.getPath(), jsonParser, async (request, response) => await handle(request, response, route));
      break;
    case "PATCH":
      app.patch(route.getPath(), jsonParser, async (request, response) => await handle(request, response, route));
      break;
    default:
      app.get(route.getPath(), jsonParser, async (request, response) => await handle(request, response, route));
      break;
  }
});

// handle other requests
app.get("*", (request, response) => {
  if (!request.path.startsWith("../")) {
    const filePath = "./public/" + request.path;

    if (fs.existsSync(filePath)) {
      let mimeType = null;

      switch (request.path.substring(request.path.indexOf(".") + 1)) {
        case "js":
          mimeType = "text/javascript";
          break;
        case "css":
          mimeType = "text/css";
          break;
        case "svg":
          mimeType = "image/svg+xml";
          break;
        case "png":
          mimeType = "image/png";
          break;
        case "jpg":
        case "jpeg":
          mimeType = "image/jpeg";
          break;
        default:
          break;
      }

      if (mimeType != null) response.header("Content-Type", mimeType);

      response.status(200);

      if (fs.lstatSync(filePath).isFile()) {
        const bytes = fs.readFileSync(filePath);

        if (filePath.endsWith(".js")) response.send(bytes.toString().replaceAll("%API_BASE_URL%", env.BASE_URL));
        else response.send(bytes);

        return;
      }
    }
  }

  // send 404
  sendJsonHeaders(response);
  response.status(404);
  response.send(
    JSON.stringify(
      {
        success: false,
        message: `The requested route '${request.method + " " + request.path}' is not implemented.`
      },
      null,
      2
    )
  );
});

// start server
const cert = env.SSL_CERT,
  certKey = env.SSL_CERT_KEY;

if (cert && certKey) {
  spdy
    .createServer(
      {
        cert: fs.readFileSync(cert),
        key: fs.readFileSync(certKey)
      },
      app
    )
    .listen(port, () => console.log(`API running on port ${port}`));
} else app.listen(port, () => console.log(`API running on port ${port}`));
