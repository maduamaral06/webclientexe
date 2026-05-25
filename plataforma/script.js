let defectCount = 0;
let normalCount = 0;
let globalCount = 0;
let timer = 0;
let history = [];
let historyFilter = 'all';

// TIMER
// setInterval(() => {
//   timer += 10;
//   atualizarTimer();
// }, 10);

// function atualizarTimer() {
//   document.getElementById('timer').innerText = formatTime(timer);
// }

// function formatTime(time) {
//   const minutes = Math.floor(time / 60000);
//   const seconds = Math.floor((time % 60000) / 1000);
//   const milliseconds = Math.floor((time % 1000) / 10);

//   return (
//     String(minutes).padStart(2, '0') + ':' +
//     String(seconds).padStart(2, '0') + ':' +
//     String(milliseconds).padStart(2, '0')
//   );
// }

function atualizarDataHoraTotal() {
  document.getElementById('horario').innerText =
    new Date().toLocaleString('pt-BR');
}

setInterval(atualizarDataHoraTotal, 1000);
atualizarDataHoraTotal();

let horarioCongelado =
  new Date().toLocaleString('pt-BR');

function atualizarDataHora() {

  document.getElementById('linhaInfo').innerText =
    'Linha TESTE · ' +
    horarioCongelado;
}

// executa ao abrir
atualizarDataHora();

// função que congela o horário atual
function congelarHorarioAtual() {

  horarioCongelado =
    new Date().toLocaleString('pt-BR');

  atualizarDataHora();
}


// FLASH EFFECT
function ativarFlash(tipo) {
  const flash = document.getElementById('flash');

  flash.className = 'flash-overlay';

  if (tipo === 'error') {
    flash.classList.add('flash-error');
  } else {
    flash.classList.add('flash-success');
  }

  setTimeout(() => {
    flash.className = 'flash-overlay';
  }, 1000);
}

// REGISTRAR DEFEITO
function registrarDefeito() {

  defectCount++;

  adicionarHistorico('defect', defectCount, timer);


  document.getElementById('defeitos').innerText = defectCount;

  document.getElementById('totalPecas').innerText =
    defectCount + normalCount;

  document.getElementById('status').innerText =
    'PEÇA COM DEFEITO';

  const tela = document.getElementById('mainScreen');

  tela.classList.remove('normal-bg');
  tela.classList.add('error-bg');

  ativarFlash('error');

  congelarHorarioAtual();
}

// REGISTRAR NORMAL
function registrarNormal() {

  normalCount++;

  adicionarHistorico('normal', normalCount, timer);

  document.getElementById('totalPecas').innerText =
    defectCount + normalCount;

  document.getElementById('status').innerText =
    'PEÇA APROVADA';

  const tela = document.getElementById('mainScreen');

  tela.classList.remove('error-bg');
  tela.classList.add('normal-bg');

  ativarFlash('success');

  congelarHorarioAtual();
}

// HISTÓRICO
function adicionarHistorico(type, count) {

  history.unshift({
    id: Date.now(),
    type,
    count,
    timestamp: new Date()
  });
}

function abrirHistorico(filter) {

  historyFilter = filter;

  const modal = document.getElementById('modalOverlay');

  modal.classList.remove('hidden');

  renderizarHistorico();
}

function fecharModal() {
  document.getElementById('modalOverlay')
    .classList.add('hidden');
}

function renderizarHistorico() {

  const lista = document.getElementById('historicoLista');

  lista.innerHTML = '';

  let filteredHistory = history;

  if (historyFilter !== 'all') {
    filteredHistory = history.filter(item => item.type === historyFilter);
  }

  document.getElementById('modalTotal').innerText =
    `Total: ${filteredHistory.length} registros`;

  if (historyFilter === 'all') {
    document.getElementById('modalTitulo').innerText =
      'Histórico de Todas as Peças';
  }

  if (historyFilter === 'defeito') {
    document.getElementById('modalTitulo').innerText =
      'Histórico de Peças com Defeito';
  }

  if (historyFilter === 'ok') {
    document.getElementById('modalTitulo').innerText =
      'Histórico de Peças Aprovadas';
  }

  filteredHistory.forEach(event => {

    const item = document.createElement('div');

    item.className = 'history-item';

    item.innerHTML = `

      <div class="history-left">

        <div class="history-id ${event.type === 'defect' ? 'error' : 'ok'}">
          #${String(
      historyFilter === 'all' ? event.globalId : event.id).padStart(4, '0')}
        </div>

        <div>
          <div class="history-title">
            ${event.type === 'defect' ? 'PEÇA COM DEFEITO' : 'PEÇA APROVADA'}
          </div>

          <div class="history-date">
            Linha TESTE · ${new Date(event.timestamp).toLocaleString('pt-BR')}
          </div>
        </div>

      </div>

      <div class="history-right">

        <div class="history-label">
          TEMPO DO TIMER
        </div>

        

      </div>
    `;

    lista.appendChild(item);
  });
}

// EXPORTAR CSV
function exportarCSV() {

  let filteredHistory = history;

  if (historyFilter !== 'all') {
    filteredHistory = history.filter(item => item.type === historyFilter);
  }

  const headers = [
    'Número',
    'Status',
    'Tempo',
    'Data'
  ];

  const rows = filteredHistory.map(event => [
    String(event.count).padStart(4, '0'),
    event.type === 'defect'
      ? 'PEÇA COM DEFEITO'
      : 'PEÇA APROVADA',
    formatTime(event.elapsedTime),
    event.timestamp.toLocaleString('pt-BR')
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csv], {
    type: 'text/csv;charset=utf-8;'
  });

  const link = document.createElement('a');

  link.href = URL.createObjectURL(blob);

  link.download = 'historico_producao.csv';

  link.click();
}

// WEBSOCKET
const socketProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const socket = new WebSocket(`${socketProtocol}//${window.location.host}`);

socket.onopen = () => {

  console.log("✅ Conectado ao servidor");

  history = [];

  defectCount = 0;

  normalCount = 0;

  document.getElementById('defeitos')
    .innerText = 0;

  document.getElementById('totalPecas')
    .innerText = 0;

  document.getElementById('status')
    .innerText = 'PEÇA APROVADA';

  renderizarHistorico();
};

socket.onmessage = function (event) {

  const data = JSON.parse(event.data);

  console.log("chegou mensagem", data);

  // HISTÓRICO DO SERVIDOR
  history = data.historico;

  // CONTADORES
  defectCount =
    history.filter(item =>
      item.type === "defect"
    ).length;

  normalCount =
    history.filter(item =>
      item.type === "normal"
    ).length;

  document.getElementById('defeitos')
    .innerText = defectCount;

  document.getElementById('totalPecas')
    .innerText =
      defectCount + normalCount;

  // CONGELA HORÁRIO
  congelarHorarioAtual();

  // RENDERIZA HISTÓRICO
  renderizarHistorico();

  // TELA VISUAL
  const tela =
    document.getElementById('mainScreen');

  if (data.tipo === "defeito") {

    document.getElementById('status')
      .innerText =
      'PEÇA COM DEFEITO';

    tela.classList.remove('normal-bg');

    tela.classList.add('error-bg');

    ativarFlash('error');
  }

  if (data.tipo === "ok") {

    document.getElementById('status')
      .innerText =
      'PEÇA APROVADA';

    tela.classList.remove('error-bg');

    tela.classList.add('normal-bg');

    ativarFlash('success');
  }
};

socket.onerror = (err) => {

  console.error(
    "❌ Erro no WebSocket",
    err
  );
};

socket.onclose = () => {

  console.log(
    "🔌 Conexão fechada"
  );
};
