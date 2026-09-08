const $ = selector => document.querySelector(selector);
const queryInput = $('#query'), results = $('#results'), reader = $('#reader');
const status = $('#status'), heading = $('#results-title'), resultCount = $('#result-count');
const manualList = $('#manual-list'), manualFilter = $('#manual-filter'), template = $('#result-template');
let manuals = [];

const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const termsFor = query => normalize(query).split(/\s+/).filter(term => term.length > 1);
const regexEscape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const size = bytes => bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;

async function initialize() {
  try {
    let manualPath = 'manuales/';
    let manifestResponse = await fetch('manuales/manifest.json');
    if (!manifestResponse.ok) {
      manualPath = '';
      manifestResponse = await fetch('manifest.json');
    }
    if (!manifestResponse.ok) throw new Error('No se encontró el índice de manuales');
    const manifest = await manifestResponse.json();
    status.textContent = `Cargando ${manifest.length} manuales…`;
    manuals = await Promise.all(manifest.map(async item => {
      const response = await fetch(`${manualPath}${encodeURIComponent(item.file)}`);
      if (!response.ok) throw new Error(`Falta el archivo: ${manualPath}${item.file}`);
      return { ...item, text: await response.text() };
    }));
    $('#library-count').textContent = `${manuals.length} manuales`;
    status.textContent = `${manuals.length} manuales listos`;
    populateLibrary(); renderResults();
  } catch (error) {
    status.textContent = 'Biblioteca no disponible';
    const local = location.protocol === 'file:';
    results.innerHTML = `<p class="empty"><strong>No se pudo cargar la biblioteca.</strong><br>${local ? 'Abre la app desde GitHub Pages o un servidor local; al abrir index.html directamente el navegador bloquea los TXT.' : 'Revisa que los TXT y manifest.json estén publicados en GitHub.'}<br><small>${error.message}</small></p>`;
  }
}

function populateLibrary() {
  manuals.forEach((manual, index) => {
    const option = document.createElement('option'); option.value = index; option.textContent = manual.title; manualFilter.append(option);
    const button = document.createElement('button'); button.className = 'manual-item'; button.type = 'button'; button.textContent = manual.title;
    button.addEventListener('click', () => openManual(manual, '', 0)); manualList.append(button);
  });
}

function rank(manual, terms) {
  const text = normalize(manual.text), title = normalize(manual.title); let score = 0, positions = [];
  terms.forEach(term => {
    const hits = [...text.matchAll(new RegExp(regexEscape(term), 'g'))].map(match => match.index);
    score += hits.length; positions.push(...hits); if (title.includes(term)) score += 18;
  });
  if (terms.length > 1 && terms.every(term => text.includes(term) || title.includes(term))) score += 12;
  return { score, positions: positions.sort((a,b) => a-b) };
}

function excerpt(text, position, radius = 210) {
  const start = Math.max(0, position - radius), end = Math.min(text.length, position + radius * 2);
  return `${start ? '…' : ''}${text.slice(start, end).replace(/\s+/g, ' ').trim()}${end < text.length ? '…' : ''}`;
}

function find(query) {
  const terms = termsFor(query);
  if (!terms.length) return manuals.map(manual => ({ manual, score: 0, positions: [], excerpt: excerpt(manual.text, 0, 180) }));
  return manuals.map(manual => ({ manual, ...rank(manual, terms) }))
    .filter(item => item.score).sort((a,b) => b.score-a.score || a.manual.title.localeCompare(b.manual.title))
    .map(item => ({ ...item, excerpt: excerpt(item.manual.text, item.positions[0]) }));
}

function highlight(container, text, terms) {
  if (!terms.length) { container.textContent = text; return; }
  const pattern = new RegExp(`(${terms.map(regexEscape).join('|')})`, 'gi'); let cursor = 0;
  text.replace(pattern, (match, _part, offset) => {
    container.append(document.createTextNode(text.slice(cursor, offset)));
    const mark = document.createElement('mark'); mark.textContent = match; container.append(mark); cursor = offset + match.length;
  });
  container.append(document.createTextNode(text.slice(cursor)));
}

function renderResults(query = queryInput.value.trim()) {
  const found = find(query), terms = termsFor(query);
  heading.textContent = query ? `Resultados para “${query}”` : 'Explora la biblioteca';
  resultCount.textContent = query ? `${found.length} manual${found.length === 1 ? '' : 'es'}` : `${manuals.length} disponibles`;
  results.replaceChildren();
  if (!found.length) { results.innerHTML = '<p class="empty">No encontré coincidencias. Prueba con términos más cortos, nombres en inglés o una palabra de la sintaxis.</p>'; return; }
  found.slice(0, 18).forEach(item => results.append(makeCard(item, terms, query)));
}

function makeCard(item, terms, query) {
  const card = template.content.cloneNode(true), button = card.querySelector('button');
  card.querySelector('.document-name').textContent = item.manual.title;
  card.querySelector('.score').textContent = query ? `${item.score} coincidencias` : size(item.manual.bytes);
  card.querySelector('.result-title').textContent = query || item.manual.title;
  highlight(card.querySelector('.excerpt'), item.excerpt, terms);
  button.addEventListener('click', () => openManual(item.manual, query, item.positions[0] || 0));
  return card;
}

function openManual(manual, query, position = 0) {
  const terms = termsFor(query), start = Math.max(0, position - 950), end = Math.min(manual.text.length, position + 2600);
  const passage = `${start ? '…\n\n' : ''}${manual.text.slice(start, end).trim()}${end < manual.text.length ? '\n\n…' : ''}`;
  reader.replaceChildren();
  const head = document.createElement('div'); head.className = 'reader-head';
  head.innerHTML = '<p class="eyebrow"></p><h2></h2><div class="reader-actions"><button class="copy" type="button">Copiar contexto</button><button class="ask" type="button">Consultar en ChatGPT ↗</button></div>';
  head.querySelector('.eyebrow').textContent = `Manual · ${size(manual.bytes)}`; head.querySelector('h2').textContent = manual.title;
  const body = document.createElement('div'); body.className = 'reader-body'; highlight(body, passage, terms);
  const note = document.createElement('p'); note.className = 'reader-note'; note.textContent = start || end === manual.text.length ? 'Mostrando el inicio o final del manual.' : 'Mostrando contexto alrededor de la coincidencia más relevante.';
  reader.append(head, body, note);
  const context = `Actúa como un programador senior experto en COBOL e isCOBOL.\n\nConsulta: ${query || 'Explícame este pasaje y cuándo usarlo.'}\n\nFuente: manual “${manual.title}”.\n\nContexto del manual:\n${passage}\n\nResponde en español. Distingue lo que afirma el manual de tus recomendaciones. Incluye pasos concretos y un ejemplo COBOL/isCOBOL cuando ayude.`;
  head.querySelector('.copy').addEventListener('click', event => copy(context, event.currentTarget));
  head.querySelector('.ask').addEventListener('click', async event => { await copy(context, event.currentTarget); window.open('https://chatgpt.com/', '_blank', 'noopener'); });
  [...manualList.children].forEach(button => button.classList.toggle('active', button.textContent === manual.title));
  manualFilter.value = String(manuals.indexOf(manual));
  if (innerWidth < 960) reader.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function copy(text, button) {
  try { await navigator.clipboard.writeText(text); const label = button.textContent; button.textContent = '¡Contexto copiado!'; setTimeout(() => button.textContent = label, 1800); }
  catch { button.textContent = 'Copia el texto manualmente'; }
}

$('#search-form').addEventListener('submit', event => { event.preventDefault(); renderResults(); });
queryInput.addEventListener('input', renderResults);
manualFilter.addEventListener('change', event => { if (event.target.value !== '') openManual(manuals[Number(event.target.value)], queryInput.value.trim(), 0); });
document.querySelectorAll('.chip').forEach(button => button.addEventListener('click', () => { queryInput.value = button.dataset.query; renderResults(); queryInput.focus(); }));
document.addEventListener('keydown', event => { if (event.key === '/' && document.activeElement !== queryInput) { event.preventDefault(); queryInput.focus(); } });
initialize();
