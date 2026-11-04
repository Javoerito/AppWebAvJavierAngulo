using System;
using System.Configuration;
using System.Data;
using System.IO;
using System.Web.UI.WebControls;

namespace WebAppPoliMusicV3
{
    public partial class Song : System.Web.UI.Page
    {
        string strConnString = ConfigurationManager.ConnectionStrings["BDD_PoliMusicConnectionString"].ConnectionString;
        const string SONG_FOLDER = "~/SongFiles/";

        private bool IsAdmin
        {
            get
            {
                var user = Session[EntityLayer.PoliMusicV3.Util.Constants.USER] as EntityLayer.PoliMusicV3.User;
                return user != null && user.UserType == EntityLayer.PoliMusicV3.Util.Constants.ID_USER_ADMIN;
            }
        }

        protected void Page_Load(object sender, EventArgs e)
        {
            if (!IsPostBack)
            {
                pnlAdmin.Visible = IsAdmin;
                gvSongs.Columns[gvSongs.Columns.Count - 1].Visible = IsAdmin;
                LoadSongs();
            }
        }

        private void LoadSongs()
        {
            gvSongs.DataSource = new BLL.PoliMusicV3.Song(strConnString).Read();
            gvSongs.DataBind();
        }

        protected void btnSave_Click(object sender, EventArgs e)
        {
            if (!IsAdmin) return;

            var song = new EntityLayer.PoliMusicV3.Song();
            song.ID = Convert.ToInt32(hfSongId.Value);
            song.Name = txtName.Text.Trim();

            var bll = new BLL.PoliMusicV3.Song(strConnString);
            string msg = bll.ValidateSong(song);
            if (msg != string.Empty) { lblMessage.ForeColor = System.Drawing.Color.Red; lblMessage.Text = msg; return; }

            bool isNew = song.ID == 0;

            if (fupSong.HasFile)
            {
                string fileName = Path.GetFileNameWithoutExtension(fupSong.FileName).Replace(" ", "");
                msg = new FileManagement().SaveSongOnServer(fupSong, SONG_FOLDER, fileName);
                if (msg != string.Empty) { lblMessage.ForeColor = System.Drawing.Color.Red; lblMessage.Text = msg; return; }
                song.Path = SONG_FOLDER + fileName + Path.GetExtension(fupSong.FileName).ToLower();
            }
            else if (isNew)
            {
                lblMessage.ForeColor = System.Drawing.Color.Red;
                lblMessage.Text = "Select a song file first!!";
                return;
            }

            if (isNew) bll.Save(song); else bll.Update(song);

            lblMessage.ForeColor = System.Drawing.Color.Green;
            lblMessage.Text = isNew ? "Song created successfully!" : "Song updated successfully!";
            ClearForm();
            LoadSongs();
        }

        protected void btnCancel_Click(object sender, EventArgs e)
        {
            ClearForm();
            lblMessage.Text = string.Empty;
        }

        protected void gvSongs_RowCommand(object sender, GridViewCommandEventArgs e)
        {
            if (!IsAdmin) return;
            int id = Convert.ToInt32(e.CommandArgument);
            var bll = new BLL.PoliMusicV3.Song(strConnString);

            if (e.CommandName == "EditSong")
            {
                DataRow[] rows = bll.Read().Select("ID_SONG = " + id);
                if (rows.Length == 0) return;
                hfSongId.Value = id.ToString();
                txtName.Text = rows[0]["SONG_NAME"].ToString();
                lblFormTitle.Text = "Editar canción";
            }
            else if (e.CommandName == "DeleteSong")
            {
                try
                {
                    bll.Delete(id);
                    lblMessage.ForeColor = System.Drawing.Color.Green;
                    lblMessage.Text = "Song deleted.";
                    LoadSongs();
                }
                catch (Exception ex)
                {
                    lblMessage.ForeColor = System.Drawing.Color.Red;
                    lblMessage.Text = "Could not delete: " + ex.Message;
                }
            }
        }

        private void ClearForm()
        {
            hfSongId.Value = "0";
            txtName.Text = string.Empty;
            lblFormTitle.Text = "Nueva canción";
        }
    }
}