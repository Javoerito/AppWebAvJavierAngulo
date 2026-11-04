using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Text;
using System.Threading.Tasks;


namespace DAL.PoliMusicV3
{
    public class Song
    {
        private string strConnectionString;
        public Song(string strConnString)
        {
            strConnectionString = strConnString;
        }

        public DataTable Read()
        {
            DataTable dt = new DataTable();
            using (SqlConnection con = new SqlConnection(strConnectionString))
            using (SqlCommand cmd = new SqlCommand(
                "SELECT [ID_SONG],[SONG_NAME],[SONG_PATH],[PLAYS] FROM [TBL_SONG] ORDER BY [ID_SONG]", con))
            using (SqlDataAdapter sda = new SqlDataAdapter(cmd))
            {
                sda.Fill(dt);
                return dt;
            }
        }

        public int Save(EntityLayer.PoliMusicV3.Song song)
        {
            using (SqlConnection con = new SqlConnection(strConnectionString))
            using (SqlCommand cmd = new SqlCommand(
                "INSERT INTO [TBL_SONG]([SONG_NAME],[SONG_PATH],[PLAYS]) VALUES(@SONG_NAME,@SONG_PATH,0)", con))
            {
                cmd.Parameters.AddWithValue("@SONG_NAME", song.Name);
                cmd.Parameters.AddWithValue("@SONG_PATH", song.Path);
                con.Open();
                return cmd.ExecuteNonQuery();
            }
        }

        public int Update(EntityLayer.PoliMusicV3.Song song)
        {
            string sentence = "UPDATE [TBL_SONG] SET [SONG_NAME]=@SONG_NAME";
            bool hasPath = !string.IsNullOrEmpty(song.Path);
            if (hasPath) sentence += ",[SONG_PATH]=@SONG_PATH";
            sentence += " WHERE [ID_SONG]=@ID_SONG";

            using (SqlConnection con = new SqlConnection(strConnectionString))
            using (SqlCommand cmd = new SqlCommand(sentence, con))
            {
                cmd.Parameters.AddWithValue("@ID_SONG", song.ID);
                cmd.Parameters.AddWithValue("@SONG_NAME", song.Name);
                if (hasPath) cmd.Parameters.AddWithValue("@SONG_PATH", song.Path);
                con.Open();
                return cmd.ExecuteNonQuery();
            }
        }

        public int Delete(int id)
        {
            using (SqlConnection con = new SqlConnection(strConnectionString))
            using (SqlCommand cmd = new SqlCommand("DELETE [TBL_SONG] WHERE [ID_SONG]=@ID_SONG", con))
            {
                cmd.Parameters.AddWithValue("@ID_SONG", id);
                con.Open();
                return cmd.ExecuteNonQuery();
            }
        }
    }
}