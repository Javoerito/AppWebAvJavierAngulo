<%@ Language="VBScript" CodePage="65001" %>
<%
' =====================================================================
' song_delete.asp - DELETE de TBL_SONG (SOLO ADMIN, SOLO POST)
' Borra primero las filas hijas (FK) y luego la canción, todo en UNA
' transacción: si algo falla se hace ROLLBACK y no queda nada a medias.
' =====================================================================
Response.Charset = "utf-8"
%>
<!--#include file="includes/conexion.asp" -->
<!--#include file="includes/auth.asp" -->
<%
ExigirAdmin
ExigirPost
ExigirCsrf Request.Form("csrf")

Dim idSong, cn, cmd, rs, nombre, errNum, afectadas
idSong = SoloEntero(Request.Form("id"))
If idSong = 0 Then
    SetFlash "error", "Canción no válida."
    Response.Redirect "songs.asp"
End If

' Ejecuta un comando con un parámetro entero; devuelve el número de error (0 = OK)
Function EjecutarConId(cn, sql, id)
    Dim c
    On Error Resume Next
    Set c = NuevoCmd(cn, sql)
    ParamInt c, "id", id
    afectadas = 0
    c.Execute afectadas, , adExecuteNoRecords
    EjecutarConId = Err.Number
    On Error GoTo 0
End Function

Set cn = AbrirConexion()

' Nombre para el mensaje (y para comprobar que existe)
Set cmd = NuevoCmd(cn, "SELECT SONG_NAME FROM TBL_SONG WHERE ID_SONG = ?")
ParamInt cmd, "id", idSong
Set rs = cmd.Execute
If rs.EOF Then
    rs.Close
    CerrarConexion cn
    SetFlash "error", "La canción no existe o ya fue eliminada."
    Response.Redirect "songs.asp"
End If
nombre = rs("SONG_NAME") & ""
rs.Close
Set rs = Nothing

' ---- Transacción ----
cn.BeginTrans
errNum = EjecutarConId(cn, "DELETE FROM TBL_TRACKLIST WHERE ID_SONG = ?", idSong)
If errNum = 0 Then errNum = EjecutarConId(cn, "DELETE FROM TBL_PLAYER WHERE ID_SONG = ?", idSong)
If errNum = 0 Then errNum = EjecutarConId(cn, "DELETE FROM TBL_PLAYLIST_SONG WHERE ID_SONG = ?", idSong)
If errNum = 0 Then errNum = EjecutarConId(cn, "DELETE FROM TBL_SONG WHERE ID_SONG = ?", idSong)

If errNum = 0 Then
    cn.CommitTrans
    SetFlash "ok", "Canción «" & nombre & "» eliminada correctamente."
Else
    cn.RollbackTrans
    SetFlash "error", "No se pudo eliminar la canción. No se hizo ningún cambio."
End If
CerrarConexion cn
Response.Redirect "songs.asp"
%>
