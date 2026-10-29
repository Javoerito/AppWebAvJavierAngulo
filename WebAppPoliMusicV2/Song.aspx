<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="Song.aspx.cs" Inherits="WebAppPoliMusicV2.Song" %>

<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" data-bs-theme="dark">
<head runat="server">
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>PoliMusic - Songs</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet" />
    <style type="text/css">
        body { background: linear-gradient(180deg, #0f2a1d 0%, #121212 320px); min-height: 100vh; }
        .navbar-brand i { color: #1db954; }
        .card { border: 0; background: #1b1b1b; box-shadow: 0 6px 20px rgba(0,0,0,.4); }
        .table > :not(caption) > * > * { background: transparent; }
        audio { width: 100%; min-width: 220px; max-width: 320px; height: 36px; }
        .btn-spotify { background: #1db954; border-color: #1db954; color: #000; font-weight: 600; }
        .btn-spotify:hover { background: #1ed760; border-color: #1ed760; color: #000; }
        .song-icon { width: 38px; height: 38px; border-radius: 8px; background: #1db95433; color: #1db954;
                     display: inline-flex; align-items: center; justify-content: center; }
    </style>
    <script type="text/javascript">
        var counted = {};
        function onSongPlay(id) {
            if (counted[id]) return;      // cuenta una sola vez por carga de página
            counted[id] = true;
            registerPlay(id);
        }
        function filterSongs(txt) {
            txt = txt.toLowerCase();
            var rows = document.querySelectorAll('#<%= gvSongs.ClientID %> tbody tr');
            for (var i = 0; i < rows.length; i++) {
                rows[i].style.display = rows[i].innerText.toLowerCase().indexOf(txt) > -1 ? '' : 'none';
            }
        }
    </script>
</head>
<body>
    <form id="formSong" runat="server">

        <nav class="navbar navbar-expand bg-black bg-opacity-50 border-bottom border-secondary-subtle">
            <div class="container">
                <span class="navbar-brand fw-bold"><i class="bi bi-music-note-beamed"></i> PoliMusic</span>
                <div class="ms-auto d-flex align-items-center gap-3">
                    <span class="text-secondary"><i class="bi bi-person-circle"></i> <asp:Label ID="lblUser" runat="server"></asp:Label></span>
                    <a href="Logout.aspx" class="btn btn-outline-light btn-sm"><i class="bi bi-box-arrow-right"></i> Logout</a>
                </div>
            </div>
        </nav>

        <div class="container py-4">

            <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
                <h3 class="m-0"><i class="bi bi-collection-play text-success"></i> Song List</h3>
                <div class="input-group" style="max-width: 280px;">
                    <span class="input-group-text"><i class="bi bi-search"></i></span>
                    <input type="text" class="form-control" placeholder="Buscar canción..." onkeyup="filterSongs(this.value)" />
                </div>
            </div>

            <div class="card mb-4">
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <asp:GridView ID="gvSongs" runat="server" AutoGenerateColumns="false"
                            CssClass="table table-hover align-middle mb-0" GridLines="None"
                            UseAccessibleHeader="true" DataKeyNames="ID_SONG"
                            OnRowCommand="gvSongs_RowCommand" OnRowDataBound="gvSongs_RowDataBound">
                            <HeaderStyle CssClass="text-secondary text-uppercase small" />
                            <Columns>
                                <asp:TemplateField HeaderText="Song">
                                    <ItemTemplate>
                                        <span class="song-icon me-2"><i class="bi bi-music-note"></i></span>
                                        <span class="fw-semibold"><%# Eval("SONG_NAME") %></span>
                                    </ItemTemplate>
                                </asp:TemplateField>
                                <asp:TemplateField HeaderText="Plays">
                                    <ItemTemplate>
                                        <span class="badge rounded-pill text-bg-success">
                                            <i class="bi bi-play-fill"></i> <%# Eval("PLAYS") %>
                                        </span>
                                    </ItemTemplate>
                                </asp:TemplateField>
                                <asp:TemplateField HeaderText="Player">
                                    <ItemTemplate>
                                        <audio controls="controls" preload="none"
                                            onplay='onSongPlay(<%# Eval("ID_SONG") %>)'
                                            src='<%# ResolveUrl(Convert.ToString(Eval("SONG_PATH"))) %>'></audio>
                                    </ItemTemplate>
                                </asp:TemplateField>
                                <asp:TemplateField HeaderText="Admin">
                                    <ItemTemplate>
                                        <asp:LinkButton ID="lnkEdit" runat="server" CssClass="btn btn-outline-info btn-sm"
                                            CommandName="EditSong" CommandArgument='<%# Eval("ID_SONG") %>'>
                                            <i class="bi bi-pencil-square"></i> Edit
                                        </asp:LinkButton>
                                        <asp:LinkButton ID="lnkDelete" runat="server" CssClass="btn btn-outline-danger btn-sm"
                                            CommandName="DeleteSong" CommandArgument='<%# Eval("ID_SONG") %>'
                                            OnClientClick="return confirm('¿Eliminar esta canción?');">
                                            <i class="bi bi-trash"></i> Delete
                                        </asp:LinkButton>
                                    </ItemTemplate>
                                </asp:TemplateField>
                            </Columns>
                            <EmptyDataTemplate>
                                <div class="text-center text-secondary p-4">
                                    <i class="bi bi-emoji-neutral fs-3"></i><br />No hay canciones registradas.
                                </div>
                            </EmptyDataTemplate>
                        </asp:GridView>
                    </div>
                </div>
            </div>

            <asp:Panel ID="pnlAdmin" runat="server">
                <div class="card">
                    <div class="card-header bg-transparent border-secondary-subtle">
                        <h5 class="m-0 text-success"><i class="bi bi-cloud-arrow-up"></i>
                            <asp:Label ID="lblFormTitle" runat="server" Text="Add new song"></asp:Label>
                        </h5>
                    </div>
                    <div class="card-body">
                        <asp:HiddenField ID="hfID" runat="server" Value="0" />
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label class="form-label">Song name*</label>
                                <asp:TextBox ID="txtName" runat="server" MaxLength="50" CssClass="form-control"
                                    placeholder="Ej: Adventure"></asp:TextBox>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">MP3 file*</label>
                                <asp:FileUpload ID="fupSong" runat="server" CssClass="form-control" accept=".mp3,audio/mpeg" />
                            </div>
                        </div>
                    </div>
                    <div class="card-footer bg-transparent border-secondary-subtle d-flex gap-2">
                        <asp:LinkButton ID="btnSave" runat="server" CssClass="btn btn-spotify" OnClick="btnSave_Click">
                            <i class="bi bi-check-lg"></i> Save
                        </asp:LinkButton>
                        <asp:LinkButton ID="btnCancel" runat="server" CssClass="btn btn-outline-secondary" OnClick="btnCancel_Click">
                            <i class="bi bi-x-lg"></i> Cancel
                        </asp:LinkButton>
                    </div>
                </div>
            </asp:Panel>

            <asp:Label ID="lblMessage" runat="server" CssClass="d-block mt-3 fw-semibold" ForeColor="Red"></asp:Label>
        </div>

    </form>
</body>
</html>