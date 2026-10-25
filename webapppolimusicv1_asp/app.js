/* ============================================================
   js/app.js — PoliMusic
   songs.asp     : reproductor, visualizador, búsqueda, orden, favoritos,
                   atajos de teclado, temporizador, velocidad, Media Session
   song_form.asp : contadores y "Probar ruta"
   ============================================================ */
(function () {
  'use strict';

  const $  = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const fmt = (t) => {
    if (!isFinite(t)) return '0:00';
    const m = Math.floor(t / 60), s = Math.floor(t % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  };
  const leerLS = (k, def) => { try { const v = localStorage.getItem(k); return v === null ? def : JSON.parse(v); } catch (e) { return def; } };
  const guardarLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } };

  let toastT = null;
  function toast(msg) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.remove('show'), 2600);
  }

  if ($('#song-form')) initForm();
  if ($('#audio')) initPlayer();

  /* ---------------- Formulario crear/editar ---------------- */
  function initForm() {
    const nm = $('#song_name'), pt = $('#song_path');
    const contador = (inp, out) => {
      const upd = () => { out.textContent = inp.value.length + '/' + inp.maxLength; };
      inp.addEventListener('input', upd); upd();
    };
    contador(nm, $('#cnt-name'));
    contador(pt, $('#cnt-path'));

    const au = $('#preview-audio'), msg = $('#preview-msg');
    const estado = (txt, clase) => { msg.textContent = txt; msg.className = 'preview-msg ' + (clase || ''); };

    $('#btn-preview').addEventListener('click', () => {
      const v = pt.value.trim().replace(/^~\//, 'assets/');
      if (!v) { estado('Escribe una ruta primero.', 'bad'); return; }
      estado('Buscando archivo…');
      au.src = v;
      au.play().catch(() => {});
    });
    au.addEventListener('playing', () => { estado('Archivo encontrado ✔ (suena como vista previa)', 'ok'); setTimeout(() => au.pause(), 3000); });
    au.addEventListener('error', () => estado('No se encontró el archivo en esa ruta.', 'bad'));

    $('#song-form').addEventListener('submit', (e) => {
      if (!nm.value.trim() || !pt.value.trim()) { e.preventDefault(); estado('Completa nombre y ruta.', 'bad'); return; }
      const b = $('button[type=submit]', e.target); if (b) b.disabled = true;   // evita doble envío
    });
  }

  /* ---------------- Reproductor ---------------- */
  function initPlayer() {
    const token = document.body.getAttribute('data-csrf') || '';
    const audio = $('#audio'), deck = $('#deck'), tbody = $('#songs-body');
    const ui = {
      title: $('#np-title'), sub: $('#np-sub'), cover: $('#vinyl-cover'),
      toggle: $('#btn-toggle'), prev: $('#btn-prev'), next: $('#btn-next'),
      shuffle: $('#btn-shuffle'), repeat: $('#btn-repeat'),
      prog: $('#progress'), cur: $('#t-cur'), dur: $('#t-dur'),
      vol: $('#volume'), speed: $('#speed'), sleep: $('#sleep'),
      search: $('#search'), onlyFavs: $('#only-favs'), none: $('#no-results'), canvas: $('#viz')
    };
    const est = { row: null, shuffle: false, repeat: 'off', contado: false, arrastrando: false, sleepT: null, onlyFavs: false };
    const favs = new Set(leerLS('polimusic_favs', []).map(String));

    const filas = () => $$('tr[data-id]', tbody).filter(r => !r.hidden);

    /* ---- Cargar y reproducir ---- */
    function cargar(row) {
      if (!row) return;
      if (est.row) est.row.classList.remove('playing');
      est.row = row; est.contado = false;
      row.classList.add('playing');
      audio.defaultPlaybackRate = parseFloat(ui.speed.value) || 1;
      audio.src = row.dataset.src;
      audio.playbackRate = audio.defaultPlaybackRate;
      ui.title.textContent = row.dataset.name;
      ui.sub.textContent = 'Reproducciones: ' + row.dataset.plays;
      ui.cover.src = row.dataset.cover;
      prepararAudioContext();
      const p = audio.play();
      if (p && p.catch) p.catch(() => toast('No se pudo reproducir. Revisa la ruta del archivo.'));
      mediaSession(row);
    }
    function alternar() {
      if (!est.row) { const l = filas(); if (l.length) cargar(l[0]); return; }
      if (audio.paused) audio.play(); else audio.pause();
    }
    function mover(dir, auto) {
      const lista = filas();
      if (!lista.length) return;
      const i = lista.indexOf(est.row);
      let nuevo;
      if (est.shuffle && lista.length > 1) {
        do { nuevo = lista[Math.floor(Math.random() * lista.length)]; } while (nuevo === est.row);
      } else {
        let j = i + dir;
        if (j >= lista.length) {
          if (auto && est.repeat !== 'all') { audio.pause(); audio.currentTime = 0; return; }
          j = 0;
        }
        if (j < 0) j = lista.length - 1;
        nuevo = lista[j];
      }
      cargar(nuevo);
    }

    /* ---- Contador de reproducciones (fetch a song_play.asp) ---- */
    function registrar(row) {
      fetch('song_play.asp', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-CSRF-Token': token },
        body: 'id=' + encodeURIComponent(row.dataset.id)
      })
      .then(r => r.json())
      .then(d => {
        if (!d || !d.ok) return;
        row.dataset.plays = d.plays;
        $('.plays-n', row).textContent = d.plays;
        if (est.row === row) ui.sub.textContent = 'Reproducciones: ' + d.plays;
        actualizarStats();
      })
      .catch(() => { /* sin red: no se cuenta */ });
    }
    function actualizarStats() {
      const rows = $$('tr[data-id]', tbody);
      let total = 0, max = 0, top = 'Sin datos';
      rows.forEach(r => {
        const p = parseInt(r.dataset.plays, 10) || 0;
        total += p;
        if (p > max) { max = p; top = r.dataset.name; }
      });
      $('#stat-total').textContent = total;
      $('#stat-top').textContent = top;
      rows.forEach(r => {
        const p = parseInt(r.dataset.plays, 10) || 0;
        $('.bar i', r).style.width = (max ? Math.round(p * 100 / max) : 0) + '%';
      });
    }

    /* ---- Eventos del <audio> ---- */
    audio.addEventListener('playing', () => {
      deck.classList.add('is-playing'); document.body.classList.add('is-playing');
      ui.toggle.textContent = '❚❚';
      if (!est.contado && est.row) { est.contado = true; registrar(est.row); }
    });
    audio.addEventListener('pause', () => {
      deck.classList.remove('is-playing'); document.body.classList.remove('is-playing');
      ui.toggle.textContent = '▶';
    });
    audio.addEventListener('ended', () => {
      if (est.repeat === 'one') { est.contado = false; audio.currentTime = 0; audio.play(); }
      else mover(1, true);
    });
    audio.addEventListener('loadedmetadata', () => { ui.dur.textContent = fmt(audio.duration); });
    audio.addEventListener('timeupdate', () => {
      if (!audio.duration || est.arrastrando) return;
      ui.prog.value = (audio.currentTime / audio.duration) * 1000;
      ui.cur.textContent = fmt(audio.currentTime);
    });
    audio.addEventListener('error', () => toast('No se encontró el archivo de audio.'));

    /* ---- Controles ---- */
    ui.toggle.addEventListener('click', alternar);
    ui.next.addEventListener('click', () => mover(1, false));
    ui.prev.addEventListener('click', () => { if (audio.currentTime > 3) audio.currentTime = 0; else mover(-1, false); });
    ui.prog.addEventListener('input', () => {
      est.arrastrando = true;
      if (audio.duration) { audio.currentTime = ui.prog.value / 1000 * audio.duration; ui.cur.textContent = fmt(audio.currentTime); }
    });
    ui.prog.addEventListener('change', () => { est.arrastrando = false; });

    ui.vol.value = leerLS('polimusic_vol', 80);
    audio.volume = ui.vol.value / 100;
    ui.vol.addEventListener('input', () => { audio.volume = ui.vol.value / 100; guardarLS('polimusic_vol', +ui.vol.value); });

    ui.speed.addEventListener('change', () => {
      audio.defaultPlaybackRate = audio.playbackRate = parseFloat(ui.speed.value) || 1;
      toast('Velocidad ' + ui.speed.value + '×');
    });

    ui.shuffle.addEventListener('click', () => {
      est.shuffle = !est.shuffle;
      ui.shuffle.setAttribute('aria-pressed', est.shuffle);
      toast(est.shuffle ? 'Modo aleatorio activado' : 'Modo aleatorio desactivado');
    });
    ui.repeat.addEventListener('click', () => {
      est.repeat = est.repeat === 'off' ? 'all' : (est.repeat === 'all' ? 'one' : 'off');
      ui.repeat.textContent = 'Repetir: ' + ({ off: 'no', all: 'todas', one: 'una' })[est.repeat];
      ui.repeat.classList.toggle('on', est.repeat !== 'off');
    });

    // Temporizador de apagado
    ui.sleep.addEventListener('change', () => {
      clearTimeout(est.sleepT);
      const min = parseInt(ui.sleep.value, 10);
      if (!min) { toast('Temporizador desactivado'); return; }
      toast('La música se detendrá en ' + min + ' min');
      est.sleepT = setTimeout(() => { audio.pause(); ui.sleep.value = '0'; toast('Temporizador: música detenida'); }, min * 60000);
    });

    /* ---- Tabla: clics por delegación ---- */
    const dlg = $('#dlg-del');
    tbody.addEventListener('click', (e) => {
      const row = e.target.closest('tr[data-id]');
      if (!row) return;
      if (e.target.closest('.btn-play, .name-btn')) {
        if (row === est.row) alternar(); else cargar(row);
      } else if (e.target.closest('.btn-fav')) {
        const id = row.dataset.id;
        if (favs.has(id)) favs.delete(id); else favs.add(id);
        guardarLS('polimusic_favs', Array.from(favs));
        pintarFavs();
        toast(favs.has(id) ? 'Añadida a favoritas' : 'Quitada de favoritas');
        if (est.onlyFavs) filtrar();
      } else if (e.target.closest('[data-del]') && dlg) {
        $('#del-id').value = row.dataset.id;
        $('#del-name').textContent = row.dataset.name;
        dlg.showModal();
      }
    });
    if (dlg) $('#del-cancel').addEventListener('click', () => dlg.close());

    /* ---- Favoritas ---- */
    function pintarFavs() {
      $$('tr[data-id]', tbody).forEach(r => {
        const on = favs.has(r.dataset.id), b = $('.btn-fav', r);
        b.setAttribute('aria-pressed', on);
        b.textContent = on ? '♥' : '♡';
      });
    }
    pintarFavs();

    /* ---- Búsqueda en vivo + solo favoritas ---- */
    function filtrar() {
      const q = ui.search.value.trim().toLowerCase();
      let vis = 0;
      $$('tr[data-id]', tbody).forEach(r => {
        const ok = r.dataset.name.toLowerCase().includes(q) && (!est.onlyFavs || favs.has(r.dataset.id));
        r.hidden = !ok; if (ok) vis++;
      });
      ui.none.hidden = vis > 0 || !$$('tr[data-id]', tbody).length;
      if (!ui.none.hidden && $$('tr[data-id]', tbody).length) ui.none.textContent = 'Ninguna canción coincide con tu búsqueda.';
    }
    ui.search.addEventListener('input', filtrar);
    ui.onlyFavs.addEventListener('click', () => {
      est.onlyFavs = !est.onlyFavs;
      ui.onlyFavs.setAttribute('aria-pressed', est.onlyFavs);
      filtrar();
    });

    /* ---- Ordenar por columna ---- */
    const orden = { key: 'id', dir: 1 };
    $$('.sort').forEach(btn => btn.addEventListener('click', () => {
      const k = btn.dataset.sort;
      orden.dir = (orden.key === k) ? -orden.dir : (k === 'plays' ? -1 : 1);
      orden.key = k;
      const rows = $$('tr[data-id]', tbody);
      rows.sort((a, b) => {
        if (k === 'name') return a.dataset.name.localeCompare(b.dataset.name, 'es') * orden.dir;
        return (parseInt(a.dataset.plays, 10) - parseInt(b.dataset.plays, 10)) * orden.dir;
      });
      rows.forEach(r => tbody.appendChild(r));
      $$('.sort').forEach(x => x.parentNode.setAttribute('aria-sort', 'none'));
      btn.parentNode.setAttribute('aria-sort', orden.dir === 1 ? 'ascending' : 'descending');
    }));

    /* ---- Atajos de teclado ---- */
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target, tag = t.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') { e.preventDefault(); ui.search.focus(); return; }
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (tag === 'BUTTON' && e.key === ' ') return;
      switch (e.key) {
        case ' ':          e.preventDefault(); alternar(); break;
        case 'ArrowRight': audio.currentTime = Math.min((audio.duration || 0), audio.currentTime + 5); break;
        case 'ArrowLeft':  audio.currentTime = Math.max(0, audio.currentTime - 5); break;
        case 'n': case 'N': mover(1, false); break;
        case 'p': case 'P': ui.prev.click(); break;
        case 'm': case 'M': audio.muted = !audio.muted; toast(audio.muted ? 'Silenciado' : 'Sonido activado'); break;
        case 's': case 'S': ui.shuffle.click(); break;
      }
    });

    /* ---- Media Session (teclas multimedia / pantalla de bloqueo) ---- */
    function mediaSession(row) {
      if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
      navigator.mediaSession.metadata = new MediaMetadata({
        title: row.dataset.name, artist: 'PoliMusic', artwork: [{ src: row.dataset.cover }]
      });
    }
    if ('mediaSession' in navigator) {
      const ms = navigator.mediaSession;
      ms.setActionHandler('play', () => audio.play());
      ms.setActionHandler('pause', () => audio.pause());
      ms.setActionHandler('previoustrack', () => ui.prev.click());
      ms.setActionHandler('nexttrack', () => mover(1, false));
    }

    /* ---- Visualizador de audio (Web Audio API + canvas) ---- */
    let ctx = null, analyser = null, datos = null;
    function prepararAudioContext() {
      if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        ctx = new AC();
        const src = ctx.createMediaElementSource(audio);
        analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.8;
        src.connect(analyser);
        analyser.connect(ctx.destination);
        datos = new Uint8Array(analyser.frequencyBinCount);
      } catch (e) { ctx = null; analyser = null; }
    }
    const g = ui.canvas.getContext('2d');
    function dibujar() {
      requestAnimationFrame(dibujar);
      if (document.hidden) return;
      const w = ui.canvas.width, h = ui.canvas.height, n = 32, bw = w / n;
      g.clearRect(0, 0, w, h);
      const vivo = analyser && !audio.paused;
      if (vivo) analyser.getByteFrequencyData(datos);
      for (let i = 0; i < n; i++) {
        const v = vivo ? datos[i] / 255 : 0.04;
        const bh = Math.max(3, v * h);
        const gr = g.createLinearGradient(0, h, 0, h - bh);
        gr.addColorStop(0, '#8C0F14'); gr.addColorStop(1, '#FF4338');
        g.fillStyle = gr;
        g.fillRect(i * bw + 2, h - bh, bw - 4, bh);
      }
    }
    dibujar();
  }
})();
