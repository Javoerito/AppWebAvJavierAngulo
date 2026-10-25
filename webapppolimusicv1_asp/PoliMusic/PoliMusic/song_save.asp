<%@ Language="VBScript" CodePage="65001" %>
<%
Option Explicit
Response.CharSet = "utf-8"
%>
<!-- #include file="includes/auth.asp" -->
<!-- #include file="includes/conexion.asp" -->
<%
' ============================================================
' song_save.asp — INSERT / UPDATE (solo admin, solo POST)
' ============================================================
Dim idTxt, nombre, ruta, errores, esEdicion, c

RequerirAdmin   ' verificación de rol en el servidor

If UCase(Request.ServerVariables("REQUEST_METHOD")) <> "POST" Then Response.Redirect "songs.asp"

If Not TokenValido(Request.Form("csrf")) Then
  Flash "error", "El formulario expiró. Vuelve a intentarlo."
  Response.Redirect "songs.asp"
End If

idTxt  = Trim(Request.Form("id"))
nombre = Trim(Request.Form("song_name"))
ruta   = Trim(Request.Form("song_path"))
esEdicion = (idTxt <> "")

If esEdicion And Not EsEntero(idTxt) Then
  Flash "error", "Identificador de canción inválido."
  Response.Redirect "songs.asp"
End If

' ---- Validación ----
errores = ""
If nombre = "" Then
  errores = errores & "El nombre es obligatorio. "
ElseIf Len(nombre) > 50 Then
  errores = errores & "El nombre admite máximo 50 caracteres. "
End If

If ruta = "" Then
  errores = errores & "La ruta del archivo es obligatoria. "
ElseIf Len(ruta) > 255 Then
  errores = errores & "La ruta admite máximo 255 caracteres. "
ElseIf Not RutaCancionValida(ruta) Then
  errores = errores & "La ruta debe iniciar con ~/ o assets/ y terminar en .mp3, .wav, .ogg o .m4a. "
End If

If errores <> "" Then
  Session("old_name") = nombre
  Session("old_path") = ruta
  Flash "error", errores
  If esEdicion Then
    Response.Redirect "song_form.asp?id=" & idTxt
  Else
    Response.Redirect "song_form.asp"
  End If
End If

' ---- Guardado con consultas parametrizadas ----
AbrirConexion
On Error Resume Next
If esEdicion Then
  Set c = NuevoCmd("UPDATE TBL_SONG SET SONG_NAME = ?, SONG_PATH = ? WHERE ID_SONG = ?")
  PStr c, "@n", nombre, 50
  PStr c, "@p", ruta, 255
  PInt c, "@id", idTxt
Else
  Set c = NuevoCmd("INSERT INTO TBL_SONG (SONG_NAME, SONG_PATH, PLAYS) VALUES (?, ?, 0)")
  PStr c, "@n", nombre, 50
  PStr c, "@p", ruta, 255
End If
c.Execute , , adExecuteNoRecords

If Err.Number <> 0 Then
  Flash "error", "No se pudo guardar la canción. Revisa la conexión a la base de datos."
Else
  If esEdicion Then
    Flash "ok", "Canción actualizada correctamente."
  Else
    Flash "ok", "Canción creada correctamente."
  End If
End If
On Error GoTo 0

CerrarConexion
Response.Redirect "songs.asp"
%>
