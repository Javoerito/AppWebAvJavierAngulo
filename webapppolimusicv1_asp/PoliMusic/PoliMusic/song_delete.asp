<%@ Language="VBScript" CodePage="65001" %>
<%
Option Explicit
Response.CharSet = "utf-8"
%>
<!-- #include file="includes/auth.asp" -->
<!-- #include file="includes/conexion.asp" -->
<%
' ============================================================
' song_delete.asp — DELETE (solo admin, solo POST)
' Primero borra las filas hijas (FK) y al final TBL_SONG,
' todo dentro de UNA transacción: si algo falla, se revierte.
' ============================================================
Dim idTxt, ok

RequerirAdmin

If UCase(Request.ServerVariables("REQUEST_METHOD")) <> "POST" Then Response.Redirect "songs.asp"

If Not TokenValido(Request.Form("csrf")) Then
  Flash "error", "El formulario expiró. Vuelve a intentarlo."
  Response.Redirect "songs.asp"
End If

idTxt = Trim(Request.Form("id"))
If Not EsEntero(idTxt) Then
  Flash "error", "Identificador de canción inválido."
  Response.Redirect "songs.asp"
End If

AbrirConexion
ok = False
On Error Resume Next
cn.BeginTrans
EjecutarConId "DELETE FROM TBL_TRACKLIST     WHERE ID_SONG = ?", idTxt
If Err.Number = 0 Then EjecutarConId "DELETE FROM TBL_PLAYER        WHERE ID_SONG = ?", idTxt
If Err.Number = 0 Then EjecutarConId "DELETE FROM TBL_PLAYLIST_SONG WHERE ID_SONG = ?", idTxt
If Err.Number = 0 Then EjecutarConId "DELETE FROM TBL_SONG          WHERE ID_SONG = ?", idTxt

If Err.Number = 0 Then
  cn.CommitTrans
  ok = True
Else
  cn.RollbackTrans
End If
On Error GoTo 0
CerrarConexion

If ok Then
  Flash "ok", "Canción eliminada (y sus referencias en álbumes, artistas y playlists)."
Else
  Flash "error", "No se pudo eliminar la canción. No se hizo ningún cambio."
End If
Response.Redirect "songs.asp"
%>
