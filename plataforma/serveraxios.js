const fs = require("fs");
const AxiosDigestAuth = require("@mhoc/axios-digest-auth").default;
const axios = require("axios");
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();

app.use(express.json());

//SNAPSHOTS
const SNAPSHOT_BASE_PATH = path.join(__dirname, "snapshots");
const OK_PATH = path.join(SNAPSHOT_BASE_PATH, "ok");
const NOK_PATH = path.join(SNAPSHOT_BASE_PATH, "nok");

function criarPastaSnapshot() {
  if (!fs.existsSync(SNAPSHOT_BASE_PATH)) {
    fs.mkdirSync(SNAPSHOT_BASE_PATH);
  }

  if (!fs.existsSync(OK_PATH)) {
    fs.mkdirSync(OK_PATH);
  }

  if (!fs.existsSync(NOK_PATH)) {
    fs.mkdirSync(NOK_PATH);
  }
}

criarPastaSnapshot();

//CONFIGURAÇÕES DA CÂMERA
const CAMERA_IP = "10.11.13.180";
const CAMERA_CHANNEL = 1;
const CAMERA_USER = "admin";
const CAMERA_PASSWORD = "admin123";

const digestAuth =
  new AxiosDigestAuth({

    username: CAMERA_USER,

    password: CAMERA_PASSWORD
  });

//console.log(digestAuth);

//BAIXAR SNAPSHOT
async function salvarSnapshot(tipo) {
  try {
    const timestamp = Date.now();
    const nomeArquivo = `${timestamp}.jpg`;

    const pastaDestino =
      tipo === "ok" ? OK_PATH : NOK_PATH;

    const caminhoCompleto = path.join(
      pastaDestino, nomeArquivo
    );

    const url = `http://${CAMERA_IP}/cgi-bin/snapshot.cgi?`;

    const response = await digestAuth.request({
      method: "GET",
      url,
      responseType: "stream",
      timeout: 10000,
    });

    // const response = await axios({
    //   method: "GET",
    //   url,
    //   responseType: "stream",
    //   timeout: 10000
    // });

    const writer = fs.createWriteStream(
      caminhoCompleto
    );

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", () => {
        console.log(
          `📸 Snapshot salvo: ${caminhoCompleto}`
        );
        resolve(caminhoCompleto);
      });

      writer.on("error", reject);
    });

  } catch (error) {
    console.error(
      " Erro ao salvar snapshot:",
      error.message,
      console.log(error)
    );
  }
}

// SERVIR FRONTEND
app.use("/img", express.static(path.join(__dirname, "img")));

app.use(
  "/snapshots",
  express.static(
    path.join(__dirname, "snapshots")
  )
);

app.get("/style.css", (req, res) => {

  res.sendFile(
    path.join(__dirname, "style.css")
  );
});

app.get("/script.js", (req, res) => {

  res.sendFile(
    path.join(__dirname, "script.js")
  );
});

const server = http.createServer(app);

const wss = new WebSocket.Server({
  server
});

// CLIENTES
let clients = [];

// HISTÓRICO
let historico = [];

let defectCount = 0;

let normalCount = 0;

let globalCount = 0;

// WEBSOCKET
wss.on("connection", (ws) => {

  console.log("✅ Cliente conectado");

  // limpa tudo ao recarregar página
  limparDados();

  clients.push(ws);

  ws.on("close", () => {

    console.log("🔌 Cliente desconectado");

    clients =
      clients.filter(client =>
        client !== ws
      );
  });
});

// ENVIAR PARA TODOS
function broadcast(data) {

  clients.forEach(ws => {

    if (ws.readyState === WebSocket.OPEN) {

      ws.send(
        JSON.stringify(data)
      );
    }
  });
}

// DEFEITO
app.post("/defeito", async (req, res) => {

  globalCount++;

  defectCount++;

  const novoItem = {

    globalId: globalCount,

    id: defectCount,

    type: "defect",

    tempo:
      req.body?.tempo || "",

    timestamp:
      new Date()
  };

  historico.unshift(novoItem);

  broadcast({

    tipo: "defeito",

    historico
  });

  await salvarSnapshot("nok");

  res.send("Defeito enviado");
});

// OK
app.post("/ok", async (req, res) => {

  globalCount++;

  normalCount++;

  const novoItem = {

    globalId: globalCount,

    id: normalCount,

    type: "normal",

    tempo:
      req.body?.tempo || "",

    timestamp:
      new Date()
  };

  historico.unshift(novoItem);

  broadcast({

    tipo: "ok",

    historico
  });

  await salvarSnapshot("ok");

  res.send("OK enviado");
});

// ROTA PRINCIPAL
app.get("/", (req, res) => {

  res.sendFile(
    path.join(__dirname, "index.html")
  );
});

function limparDados() {

  historico = [];

  defectCount = 0;

  normalCount = 0;

  globalCount = 0;

  console.log("🧹 Dados resetados");
}

// START SERVER
const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {

  console.log(
    `🚀 Servidor rodando em http://localhost:${PORT}`
  );
});
