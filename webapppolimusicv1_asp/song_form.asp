<%@ Language="VBScript" CodePage="65001" %>
<%
' =====================================================================
' song_form.asp - Formulario crear / editar canción (SOLO ADMIN)
' =====================================================================
Response.Charset = "utf-8"
%>
<!--#include file="includes/conexion.asp" -->
<!--#include file="includes/auth.asp" -->
<%
ExigirAdmin

Dim idSong, nombre, ruta, esEdicion, cn, cmd, rs
idSong = SoloEntero(Request.QueryString("id"))
esEdicion = (idSong > 0)
nombre = ""
ruta = "~/SongFiles/bensound-adventure.mp3"

If esEdicion Then
    Set cn = AbrirConexion()
    Set cmd = NuevoCmd(cn, "SELECT SONG_NAME, SONG_PATH FROM TBL_SONG WHERE ID_SONG = ?")
    ParamInt cmd, "id", idSong
    Set rs = cmd.Execute
    If rs.EOF Then
        rs.Close
        CerrarConexion cn
        SetFlash "error", "La canción que intentas editar no existe."
        Response.Redirect "songs.asp"
    End If
    nombre = rs("SONG_NAME") & ""
    ruta = rs("SONG_PATH") & ""
    rs.Close
    Set rs = Nothing
    CerrarConexion cn
End If

' Si song_save.asp devolvió un error de validación, recuperamos lo escrito
If Session("old_set") = "1" Then
    nombre = Session("old_nombre") & ""
    ruta = Session("old_ruta") & ""
    Session("old_set") = ""
End If
%>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><% If esEdicion Then %>Editar<% Else %>Nueva<% End If %> canción · PoliMusic</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Sora:wght@600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
</head>
<body data-csrf="<%= Hx(Session("csrf")) %>">
  <!--#include file="includes/header.asp" -->

  <main class="container container-narrow">
    <section class="card card-pad">
      <h1 class="section-title"><% If esEdicion Then %>Editar canción<% Else %>Nueva canción<% End If %></h1>
      <%= HtmlFlash() %>

      <form method="post" action="song_save.asp" class="form" novalidate>
        <input type="hidden" name="csrf" value="<%= Hx(Session("csrf")) %>">
        <input type="hidden" name="id" value="<%= idSong %>">

        <label for="nombre">Nombre de la canción</label>
        <input type="text" id="nombre" name="nombre" maxlength="50" required value="<%= Hx(nombre) %>" placeholder="Ej.: Adventure">
        <small class="hint">Máximo 50 caracteres.</small>

        <label for="ruta">Ruta del archivo de audio</label>
        <input type="text" id="ruta" name="ruta" maxlength="255" required list="rutas-sugeridas" value="<%= Hx(ruta) %>" placeholder="~/SongFiles/bensound-adventure.mp3">
        <datalist id="rutas-sugeridas">
          <option value="~/SongFiles/bensound-adventure.mp3">
        </datalist>
        <small class="hint">Debe empezar con <code>~/</code> (carpeta assets) y terminar en .mp3, .ogg, .wav o .m4a. Máximo 255 caracteres.</small>

        <div class="form-actions">
          <a class="btn btn-ghost" href="songs.asp">Cancelar</a>
          <button type="submit" class="btn btn-primary"><% If esEdicion Then %>Guardar cambios<% Else %>Crear canción<% End If %></button>
        </div>
      </form>
    </section>
  </main>
  <script src="js/app.js"></script>
</body>
</html>
