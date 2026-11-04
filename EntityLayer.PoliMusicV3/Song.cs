using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;


namespace EntityLayer.PoliMusicV3
{
    public class Song
    {
        public Song() { }
        public Song(int id, string name, string path, int plays)
        {
            ID = id; Name = name; Path = path; Plays = plays;
        }
        public int ID { get; set; }
        public string Name { get; set; }
        public string Path { get; set; }
        public int Plays { get; set; }
    }
}
