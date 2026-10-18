using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Drawing;
using ShooterlandEditor.Properties;

namespace ShooterlandEditor
{
    public class Utils
    {
        public static Bitmap GetBitmap(int tile)
        {
            switch (tile)
            {
                case 1: return Resources.tile1;
                case 2: return Resources.tile2;
                case 3: return Resources.tile3;
                case 4: return Resources.tile4;
                case 5: return Resources.tile5;
                case 6: return Resources.tile6;
                case 7: return Resources.tile7;
                case 8: return Resources.tile8;
                case 9: return Resources.tile9;
                case 10: return Resources.tile10;
                case 11: return Resources.tile11;
                case 12: return Resources.tile12;
                case 13: return Resources.tile13;
                case 14: return Resources.tile14;
                case 15: return Resources.tile15;
                case 16: return Resources.tile16;
                case 17: return Resources.tile17;
                default: throw new Exception("unknown tile");
            }
        }
    }
}
