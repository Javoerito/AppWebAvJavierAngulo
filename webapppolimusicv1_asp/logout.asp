<%@ Language="VBScript" CodePage="65001" %>
<%
' logout.asp - Cierra la sesión y vuelve al login
Response.Charset = "utf-8"
Session.Contents.RemoveAll
Session.Abandon
Response.Redirect "login.asp?msg=bye"
%>
