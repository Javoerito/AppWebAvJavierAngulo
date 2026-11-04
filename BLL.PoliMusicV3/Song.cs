using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;


namespace BLL.PoliMusicV3
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
            return new DAL.PoliMusicV3.Song(strConnectionString).Read();
        }
        public int Save(EntityLayer.PoliMusicV3.Song song)
        {
            return new DAL.PoliMusicV3.Song(strConnectionString).Save(song);
        }
        public int Update(EntityLayer.PoliMusicV3.Song song)
        {
            return new DAL.PoliMusicV3.Song(strConnectionString).Update(song);
        }
        public int Delete(int id)
        {
            return new DAL.PoliMusicV3.Song(strConnectionString).Delete(id);
        }
        public string ValidateSong(EntityLayer.PoliMusicV3.Song song)
        {
            if (string.IsNullOrWhiteSpace(song.Name)) return "Song name is required!";
            return string.Empty;
        }
    }
}