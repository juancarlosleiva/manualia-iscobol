const queryInput = document.querySelector('#query');
const results = document.querySelector('#results');
const status = document.querySelector('#status');
const heading = document.querySelector('#results-title');
const template = document.querySelector('#result-template');
let documents = [];

const normalize = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const words = (query) => normalize(query).split(/\s+/).filter(word => word.length > 1);

async function initialize() {
  try {
    const manifest = await fetch('manuales/manifest.json').then(response => {
      if (!response.ok) throw new Error('No se encontró el índice de manuales.');
      return response.json();
    });
    status.textContent = `Cargando ${manifest.length} manuales…`;
    documents = await Promise.all(manifest.map(async item => ({
      ...item,
      text: await fetch(`manuales/${encodeURIComponent(item.file)}`).then(response => response.text())
    })));
    status.textContent = `${documents.length} manuales listos`;
    renderLibrary();
  } catch (error) {
    status.textContent = 'No se pudo cargar la biblioteca';
    results.innerHTML = `<p class="empty">${error.message} Ejecuta <code>build-data.ps1</code> antes de publicar la app.</p>`;
  }
}

function findExcerpt(text, terms) {
  const source = normalize(text);
  const positions = terms.map(term => source.indexOf(term)).filter(position => position >= 0);
  const at = Math.min(...positions);
  const start = Math.max(0, at - 160);
  const end = Math.min(text.length, at + 440);
  return `${start ? '…' : ''}${text.slice(start, end).replace(/\s+/g, ' ').trim()}${end < text.length ? '…' : ''}`;
}

function search(query) {
  const terms = words(query);
  if (!terms.length) return [];
  return documents.map(document => {
    const source = normalize(`${document.title}\n${document.text}`);
    const score = terms.reduce((total, term) => total + (source.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length, 0);
    return {...document, score, excerpt: score ? findExcerpt(document.text, terms) : ''};
  }).filter(document => document.score).sort((a,b) => b.score - a.score).slice(0, 12);
}

function renderLibrary(query = '') {
  const found = query ? search(query) : documents.slice(0, 12).map(document => ({...document, excerpt: document.text.slice(0, 330).replace(/\s+/g, ' ').trim() + '…'}));
  heading.textContent = query ? `Resultados para “${query}”` : 'Explora los manuales';
  if (!found.length) { results.innerHTML = '<p class="empty">No encontré coincidencias. Prueba con términos técnicos más cortos o en inglés.</p>'; return; }
  results.replaceChildren(...found.map(document => createCard(document, query)));
}

function createCard(document, query) {
  const card = template.content.cloneNode(true);
  card.querySelector('.tag').textContent = document.title;
  card.querySelector('.match-count').textContent = query ? `${document.score} coincidencias` : `${Math.round(document.bytes / 1024)} KB`;
  card.querySelector('h3').textContent = query || document.title;
  card.querySelector('.excerpt').textContent = document.excerpt;
  const context = `Estoy trabajando con isCOBOL. Consulta: ${query || 'Explícame este tema como programador.'}\n\nFragmento del manual “${document.title}”:\n${document.excerpt}\n\nResponde en español, con explicación técnica, pasos prácticos y ejemplos COBOL/isCOBOL cuando ayuden.`;
  card.querySelector('.copy').addEventListener('click', async event => {
    await navigator.clipboard.writeText(context);
    event.currentTarget.textContent = '¡Contexto copiado!';
    setTimeout(() => event.currentTarget.textContent = 'Copiar contexto', 1800);
  });
  card.querySelector('.ask').addEventListener('click', async () => {
    await navigator.clipboard.writeText(context);
    window.open('https://chatgpt.com/', '_blank', 'noopener');
  });
  return card;
}

queryInput.addEventListener('input', event => renderLibrary(event.target.value.trim()));
queryInput.addEventListener('keydown', event => { if (event.key === 'Enter') renderLibrary(event.target.value.trim()); });
document.querySelectorAll('.chip').forEach(button => button.addEventListener('click', () => { queryInput.value = button.dataset.query; renderLibrary(button.dataset.query); queryInput.focus(); }));
initialize();
