const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const fs = require("fs");
const https = require("https");

const app = express();

const SNAPSHOT_DIR = path.join(
    __dirname,
    "snapshots"
);

const COVER_DIR = path.join(
    SNAPSHOT_DIR,
    "cover"
);

const NOCOVER_DIR = path.join(
    SNAPSHOT_DIR,
    "nocover"
);

app.use(express.json());

app.use(
    "/snapshots",
    express.static(
        path.join(__dirname, "snapshots")
    )
);

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

async function salvarSnapshot(tipo) {

    try {

        const username = "admin";

        const password = "admin123";

        const auth = Buffer
            .from(`${username}:${password}`)
            .toString("base64");

        const options = {

            hostname: "10.11.13.180",

            port: 80,

            path: "/cgi-bin/snapshot.cgi",

            method: "GET",

            headers: {
                Authorization: `Basic ${auth}`
            }
        };

        const pastaDestino =
            tipo === "defect"
                ? COVER_DIR
                : NOCOVER_DIR;

        const nomeArquivo =
            `${Date.now()}.jpg`;

        const caminhoArquivo =
            path.join(
                pastaDestino,
                nomeArquivo
            );

        return new Promise((resolve, reject) => {

            const request = http.request(
                options,
                (response) => {

                    // STATUS
                    if (response.statusCode !== 200) {

                        reject(
                            new Error(
                                `HTTP ${response.statusCode}`
                            )
                        );

                        return;
                    }

                    const file =
                        fs.createWriteStream(
                            caminhoArquivo
                        );

                    // SALVA IMAGEM
                    response.pipe(file);

                    file.on("finish", () => {

                        file.close();

                        console.log(
                            `📸 Snapshot salvo: ${nomeArquivo}`
                        );

                        resolve(nomeArquivo);
                    });

                    file.on("error", (err) => {

                        reject(err);
                    });
                }
            );

            request.on("error", (err) => {

                reject(err);
            });

        });

    } catch (err) {

        console.log(
            "❌ Erro snapshot:",
            err.message
        );

        return null;
    }
}

// DEFEITO
app.post("/defeito", async (req, res) => {

    globalCount++;

    defectCount++;

    //SALVA SNAPSHOT
    const snapshot = await salvarSnapshot("defect");

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
app.post("/ok", async (req, res) => {

    globalCount++;

    normalCount++;

    // SALVA SNAPSHOT
    const snapshot =
        await salvarSnapshot("normal");

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
