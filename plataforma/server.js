const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();

app.use(express.json());

// SERVIR FRONTEND
app.use("/img", express.static(path.join(__dirname, "img")));

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
app.post("/defeito", (req, res) => {

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

  res.send("Defeito enviado");
});

// OK
app.post("/ok", (req, res) => {

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
