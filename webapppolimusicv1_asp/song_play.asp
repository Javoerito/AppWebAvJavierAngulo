<%@ Language="VBScript" CodePage="65001" %>
<%
' =====================================================================
' song_play.asp - Endpoint AJAX: suma 1 a PLAYS y devuelve el nuevo total
' Lo llama js/app.js con fetch() (POST + cabecera X-CSRF-Token).
' =====================================================================
Response.Charset = "utf-8"
%>
<!--#include file="includes/conexion.asp" -->
<!--#include file="includes/auth.asp" -->
<%
ExigirPost
ExigirCsrf Request.ServerVariables("HTTP_X_CSRF_TOKEN")

Dim idSong, cn, cmd, rs
idSong = SoloEntero(Request.Form("id"))
Response.ContentType = "application/json"

If idSong = 0 Then
    Response.Status = "400 Bad Request"
    Response.Write "{""ok"":false,""error"":""id""}"
    Response.End
End If

Set cn = AbrirConexion()
' UPDATE + SELECT en un solo viaje (NOCOUNT para que el 1er resultado sea el SELECT)
Set cmd = NuevoCmd(cn, "SET NOCOUNT ON; " & _
    "UPDATE TBL_SONG SET PLAYS = ISNULL(PLAYS,0)+1 WHERE ID_SONG = ?; " & _
    "SELECT PLAYS FROM TBL_SONG WHERE ID_SONG = ?")
ParamInt cmd, "id1", idSong
ParamInt cmd, "id2", idSong
Set rs = cmd.Execute

If rs.EOF Then
    Response.Status = "404 Not Found"
    Response.Write "{""ok"":false,""error"":""no_existe""}"
Else
    Response.Write "{""ok"":true,""plays"":" & CLng(rs("PLAYS")) & "}"
End If
rs.Close
Set rs = Nothing
CerrarConexion cn
%>
