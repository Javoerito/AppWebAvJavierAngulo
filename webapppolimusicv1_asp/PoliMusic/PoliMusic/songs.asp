<%@ Language="VBScript" CodePage="65001" %>
<%
Option Explicit
Response.CharSet = "utf-8"
Response.Buffer = True
Response.CacheControl = "no-store"
%>
<!-- #include file="includes/auth.asp" -->
<!-- #include file="includes/conexion.asp" -->
<%
' ============================================================
' songs.asp — Song List: bienvenida, estadísticas, tabla y reproductor
' ============================================================
RequerirSesion   ' sin sesión -> login.asp

Dim filas, nFilas, i, c, rs
Dim totalPlays, maxPlays, topNombre, fotoUsuario, esAdm
Dim fTipo, fMsg, cover, pct, src, plays

esAdm = EsAdmin()
nFilas = 0
totalPlays = 0
maxPlays = 0
topNombre = "Sin datos"

AbrirConexion

' Lectura de canciones (consulta fija, sin datos del usuario)
Set c = NuevoCmd("SELECT ID_SONG, SONG_NAME, SONG_PATH, ISNULL(PLAYS,0) AS PLAYS FROM TBL_SONG ORDER BY ID_SONG")
Set rs = c.Execute
If Not rs.EOF Then
  filas = rs.GetRows()              ' filas(columna, fila)
  nFilas = UBound(filas, 2) + 1
End If
rs.Close
Set rs = Nothing

' Estadísticas en vivo
For i = 0 To nFilas - 1
  plays = CLng(filas(3, i))
  totalPlays = totalPlays + plays
  If plays > maxPlays Then
    maxPlays = plays
    topNombre = filas(1, i)
  End If
Next

fotoUsuario = ObtenerFotoUsuario(Session("username"))
CerrarConexion

' Mensaje flash (se muestra una vez)
fTipo = Session("flash_tipo")
fMsg  = Session("flash_msg")
Session("flash_tipo") = ""
Session("flash_msg")  = ""
%>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Song List · PoliMusic</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;800&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
  <script src="js/app.js" defer></script>
</head>
<body data-csrf="<%= Esc(Session("csrf")) %>">

<a class="skip" href="#lista">Saltar al listado</a>

<header class="topbar">
  <a class="brand" href="songs.asp" aria-label="PoliMusic, inicio">
    <span class="brand-disc" aria-hidden="true"></span>
    <span class="brand-name">PoliMusic</span>
  </a>
  <div class="user">
    <img class="avatar" src="<%= Esc(fotoUsuario) %>" alt="Foto de <%= Esc(Session("username")) %>" width="44" height="44">
    <div class="user-info">
      <strong>Bienvenido, <%= Esc(Session("username")) %></strong>
      <% If esAdm Then %>
        <span class="badge badge-admin">Admin</span>
      <% Else %>
        <span class="badge badge-normal">Normal</span>
      <% End If %>
    </div>
    <a class="btn-ghost" href="logout.asp" aria-label="Cerrar sesión">Cerrar sesión</a>
  </div>
</header>

<main class="wrap">

  <% If fMsg <> "" Then %>
    <div class="flash flash-<%= Esc(fTipo) %>" role="alert"><%= Esc(fMsg) %></div>
  <% End If %>

  <section class="hero">
    <div>
      <h1>Song List</h1>
      <p class="lead">Aquí se presenta el listado de canciones de PoliMusic. Elige una y dale play.</p>
    </div>
    <dl class="stats">
      <div><dt>Canciones</dt><dd id="stat-count"><%= nFilas %></dd></div>
      <div><dt>Reproducciones</dt><dd id="stat-total"><%= totalPlays %></dd></div>
      <div><dt>La más escuchada</dt><dd id="stat-top"><%= Esc(topNombre) %></dd></div>
    </dl>
  </section>

  <div class="layout">

    <!-- ===== LISTADO ===== -->
    <section id="lista" aria-label="Listado de canciones">
      <div class="toolbar">
        <label class="search">
          <span class="sr-only">Buscar canción</span>
          <input id="search" type="search" placeholder="Buscar canción  ( / )" autocomplete="off">
        </label>
        <button id="only-favs" class="chip" type="button" aria-pressed="false">Solo favoritas</button>
        <% If esAdm Then %>
          <a class="btn-primary" href="song_form.asp">+ Nueva canción</a>
        <% End If %>
      </div>

      <div class="card">
        <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col" class="col-num">#</th>
              <th scope="col">Portada</th>
              <th scope="col" aria-sort="none"><button class="sort" type="button" data-sort="name">Canción</button></th>
              <th scope="col" aria-sort="none"><button class="sort" type="button" data-sort="plays">Reproducciones</button></th>
              <th scope="col">Reproducir</th>
              <% If esAdm Then %><th scope="col">Acciones</th><% End If %>
            </tr>
          </thead>
          <tbody id="songs-body">
          <% For i = 0 To nFilas - 1
               src   = ResolverRuta(filas(2, i))
               cover = "assets/PlaylistImages/playlist" & ((i Mod 5) + 1) & ".png"
               plays = CLng(filas(3, i))
               pct = 0
               If maxPlays > 0 Then pct = Int(plays * 100 / maxPlays)
          %>
            <tr data-id="<%= CLng(filas(0, i)) %>"
                data-src="<%= Esc(src) %>"
                data-name="<%= Esc(filas(1, i)) %>"
                data-plays="<%= plays %>"
                data-cover="<%= cover %>">
              <td class="col-num" data-label="#">
                <span class="num"><%= i + 1 %></span>
                <span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>
              </td>
              <td class="col-cover" data-label="Portada">
                <img class="cover" src="<%= cover %>" alt="Portada de <%= Esc(filas(1, i)) %>" width="52" height="52" loading="lazy">
              </td>
              <td class="col-name" data-label="Canción">
                <button class="name-btn" type="button"><%= Esc(filas(1, i)) %></button>
              </td>
              <td class="col-plays" data-label="Reproducciones">
                <span class="plays-n"><%= plays %></span>
                <span class="bar" aria-hidden="true"><i style="width:<%= pct %>%"></i></span>
              </td>
              <td class="col-play" data-label="Reproducir">
                <button class="btn-play" type="button" aria-label="Reproducir <%= Esc(filas(1, i)) %>">▶</button>
                <button class="btn-fav" type="button" aria-pressed="false" aria-label="Marcar <%= Esc(filas(1, i)) %> como favorita">♡</button>
              </td>
              <% If esAdm Then %>
              <td class="col-actions" data-label="Acciones">
                <a class="btn-mini" href="song_form.asp?id=<%= CLng(filas(0, i)) %>" aria-label="Editar <%= Esc(filas(1, i)) %>">Editar</a>
                <button class="btn-mini danger" type="button" data-del aria-label="Eliminar <%= Esc(filas(1, i)) %>">Eliminar</button>
              </td>
              <% End If %>
            </tr>
          <% Next %>
          </tbody>
        </table>
        </div>
        <p id="no-results" class="empty" <% If nFilas > 0 Then %>hidden<% End If %>>
          <% If nFilas = 0 Then %>Aún no hay canciones registradas.<% Else %>Ninguna canción coincide con tu búsqueda.<% End If %>
        </p>
      </div>
      <p class="hint">Atajos: <kbd>Espacio</kbd> play/pausa · <kbd>←</kbd> <kbd>→</kbd> ±5 s · <kbd>N</kbd> siguiente · <kbd>P</kbd> anterior · <kbd>S</kbd> aleatorio · <kbd>M</kbd> silenciar · <kbd>/</kbd> buscar</p>
    </section>

    <!-- ===== REPRODUCTOR (tornamesa) ===== -->
    <aside class="deck card" id="deck" aria-label="Reproductor">
      <div class="vinyl" aria-hidden="true">
        <img id="vinyl-cover" src="assets/PlaylistImages/playlist1.png" alt="">
      </div>
      <p class="np-label">Sonando ahora</p>
      <h2 id="np-title">Elige una canción</h2>
      <p id="np-sub" class="np-sub">Pulsa ▶ en cualquier fila</p>

      <canvas id="viz" width="640" height="110" aria-hidden="true"></canvas>

      <div class="timeline">
        <span id="t-cur">0:00</span>
        <input id="progress" type="range" min="0" max="1000" value="0" aria-label="Progreso de la canción">
        <span id="t-dur">0:00</span>
      </div>

      <div class="controls">
        <button id="btn-shuffle" class="chip" type="button" aria-pressed="false">Aleatorio</button>
        <button id="btn-prev" class="ctl" type="button" aria-label="Canción anterior">◀◀</button>
        <button id="btn-toggle" class="ctl ctl-main" type="button" aria-label="Reproducir o pausar">▶</button>
        <button id="btn-next" class="ctl" type="button" aria-label="Canción siguiente">▶▶</button>
        <button id="btn-repeat" class="chip" type="button" aria-label="Modo repetir">Repetir: no</button>
      </div>

      <div class="options">
        <label>Volumen
          <input id="volume" type="range" min="0" max="100" value="80" aria-label="Volumen">
        </label>
        <label>Velocidad
          <select id="speed" aria-label="Velocidad de reproducción">
            <option value="0.75">0.75×</option>
            <option value="1" selected>1×</option>
            <option value="1.25">1.25×</option>
            <option value="1.5">1.5×</option>
          </select>
        </label>
        <label>Dormir en
          <select id="sleep" aria-label="Temporizador de apagado">
            <option value="0" selected>Nunca</option>
            <option value="15">15 min</option>
            <option value="30">30 min</option>
            <option value="60">60 min</option>
          </select>
        </label>
      </div>

      <audio id="audio" preload="none"></audio>
    </aside>
  </div>
</main>

<% If esAdm Then %>
<!-- Modal de confirmación para eliminar (solo se renderiza para admin) -->
<dialog id="dlg-del" aria-labelledby="dlg-title">
  <form method="post" action="song_delete.asp">
    <input type="hidden" name="csrf" value="<%= Esc(Session("csrf")) %>">
    <input type="hidden" name="id" id="del-id" value="">
    <h2 id="dlg-title">¿Eliminar canción?</h2>
    <p>Se borrará <strong id="del-name"></strong> junto con sus referencias en álbumes, artistas y playlists. Esta acción no se puede deshacer.</p>
    <div class="dlg-actions">
      <button type="button" class="btn-ghost" id="del-cancel">Cancelar</button>
      <button type="submit" class="btn-primary">Sí, eliminar</button>
    </div>
  </form>
</dialog>
<% End If %>

<div id="toast" class="toast" role="status" aria-live="polite"></div>
</body>
</html>
