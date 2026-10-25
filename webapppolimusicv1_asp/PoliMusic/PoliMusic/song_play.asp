<%@ Language="VBScript" CodePage="65001" %>
<%
Option Explicit
Response.ContentType = "application/json"
Response.CharSet = "utf-8"
Response.CacheControl = "no-store"
%>
<!-- #include file="includes/auth.asp" -->
<!-- #include file="includes/conexion.asp" -->
<%
' ============================================================
' song_play.asp  (endpoint JSON, lo llama fetch() desde app.js)
' Suma +1 a PLAYS de forma atómica y devuelve el nuevo valor.
' Cualquier usuario con sesión puede reproducir.
' ============================================================
Sub JsonError(estado, codigo)
  Response.Status = estado
  Response.Write "{""ok"":false,""error"":""" & codigo & """}"
  Response.End
End Sub

Dim idTxt, c, rs

If Not SesionActiva() Then JsonError "401 Unauthorized", "sesion"
If UCase(Request.ServerVariables("REQUEST_METHOD")) <> "POST" Then JsonError "405 Method Not Allowed", "metodo"
If Not TokenValido(Request.ServerVariables("HTTP_X_CSRF_TOKEN")) Then JsonError "403 Forbidden", "token"

idTxt = Trim(Request.Form("id"))
If Not EsEntero(idTxt) Then JsonError "400 Bad Request", "id"

AbrirConexion
Set c = NuevoCmd("UPDATE TBL_SONG SET PLAYS = ISNULL(PLAYS,0) + 1 OUTPUT INSERTED.PLAYS WHERE ID_SONG = ?")
PInt c, "@id", idTxt
Set rs = c.Execute

If rs.EOF Then
  rs.Close
  CerrarConexion
  JsonError "404 Not Found", "no_existe"
End If

Response.Write "{""ok"":true,""plays"":" & CLng(rs(0)) & "}"
rs.Close
CerrarConexion
%>
