<%@ Language="VBScript" CodePage="65001" %>
<%
' =====================================================================
' song_save.asp - INSERT / UPDATE de TBL_SONG (SOLO ADMIN, SOLO POST)
' =====================================================================
Response.Charset = "utf-8"
%>
<!--#include file="includes/conexion.asp" -->
<!--#include file="includes/auth.asp" -->
<%
ExigirAdmin
ExigirPost
ExigirCsrf Request.Form("csrf")

Dim idSong, nombre, ruta, errorMsg, cn, cmd, afectadas, volver
idSong = SoloEntero(Request.Form("id"))
nombre = Trim(Request.Form("nombre"))
ruta = Trim(Request.Form("ruta"))
errorMsg = ""

' ---- Validaciones del lado servidor ----
If nombre = "" Then
    errorMsg = "El nombre de la canción es obligatorio."
ElseIf Len(nombre) > 50 Then
    errorMsg = "El nombre no puede superar 50 caracteres."
ElseIf ruta = "" Then
    errorMsg = "La ruta del archivo es obligatoria."
ElseIf Len(ruta) > 255 Then
    errorMsg = "La ruta no puede superar 255 caracteres."
ElseIf Not RutaCancionValida(ruta) Then
    errorMsg = "Ruta inválida. Usa algo como ~/SongFiles/archivo.mp3 (sin '..' ni caracteres raros)."
End If

volver = "song_form.asp"
If idSong > 0 Then volver = "song_form.asp?id=" & idSong

If errorMsg <> "" Then
    Session("old_set") = "1"
    Session("old_nombre") = nombre
    Session("old_ruta") = ruta
    SetFlash "error", errorMsg
    Response.Redirect volver
End If

Set cn = AbrirConexion()
On Error Resume Next
If idSong > 0 Then
    Set cmd = NuevoCmd(cn, "UPDATE TBL_SONG SET SONG_NAME = ?, SONG_PATH = ? WHERE ID_SONG = ?")
    ParamTexto cmd, "n", nombre, 50
    ParamTexto cmd, "r", ruta, 255
    ParamInt cmd, "id", idSong
Else
    Set cmd = NuevoCmd(cn, "INSERT INTO TBL_SONG (SONG_NAME, SONG_PATH, PLAYS) VALUES (?, ?, 0)")
    ParamTexto cmd, "n", nombre, 50
    ParamTexto cmd, "r", ruta, 255
End If
cmd.Execute afectadas, , adExecuteNoRecords
If Err.Number <> 0 Then
    errorMsg = "No se pudo guardar la canción. Intenta de nuevo."
    Err.Clear
End If
On Error GoTo 0
CerrarConexion cn

If errorMsg = "" And idSong > 0 And afectadas = 0 Then
    errorMsg = "La canción ya no existe."
End If

If errorMsg <> "" Then
    Session("old_set") = "1"
    Session("old_nombre") = nombre
    Session("old_ruta") = ruta
    SetFlash "error", errorMsg
    Response.Redirect volver
End If

If idSong > 0 Then
    SetFlash "ok", "Canción «" & nombre & "» actualizada correctamente."
Else
    SetFlash "ok", "Canción «" & nombre & "» creada correctamente."
End If
Response.Redirect "songs.asp"
%>
