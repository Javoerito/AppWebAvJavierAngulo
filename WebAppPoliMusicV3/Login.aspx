<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="Login.aspx.cs" Inherits="WebAppPoliMusicV3.Login" %>
<!DOCTYPE html>

<html xmlns="http://www.w3.org/1999/xhtml">
<head runat="server">
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>PoliMusic - Login</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
    <style>
        body { background: linear-gradient(135deg, #0f2027, #1db954); min-height: 100vh; }
    </style>
</head>
<body class="d-flex align-items-center justify-content-center">
    <form id="formLogin" runat="server" class="w-100" style="max-width: 400px;">
        <div class="card shadow-lg border-0">
            <div class="card-body p-4">
                <div class="text-center mb-4">
                    <div class="display-5 text-success">&#9835;</div>
                    <h3 class="fw-bold mb-0">PoliMusic</h3>
                    <small class="text-muted">Inicia sesión para continuar</small>
                </div>

                <div class="form-floating mb-3">
                    <asp:TextBox ID="txtLogin" runat="server" CssClass="form-control" placeholder="Username"></asp:TextBox>
                    <label for="<%= txtLogin.ClientID %>">Username</label>
                </div>

                <div class="form-floating mb-3">
                    <asp:TextBox ID="txtPassword" runat="server" TextMode="Password" CssClass="form-control" placeholder="Password"></asp:TextBox>
                    <label for="<%= txtPassword.ClientID %>">Password</label>
                </div>

                <asp:Button ID="btnLogin" runat="server" Text="Login" CssClass="btn btn-success w-100 py-2" OnClick="BtnLogin_Click" />

                <div class="text-center mt-3">
                    <asp:LinkButton ID="LinkButtonNewUser" runat="server" CssClass="link-success" OnClick="LinkButtonNewUser_Click">Enroll new user</asp:LinkButton>
                </div>

                <div class="text-center mt-3">
                    <asp:Label ID="lblMessage" runat="server" ForeColor="Red" CssClass="fw-semibold"></asp:Label>
                </div>
            </div>
        </div>
    </form>
</body>
</html>