using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Drawing;

namespace ShooterlandEditor
{
    public class Grid
    {
        private int _x, _y, _size;

        public Grid(int x, int y)
        {
            _x = x;
            _y = y;
            _size = Constants.GridSize * 40;
            Tiles = new byte[Constants.GridSize, Constants.GridSize];
        }

        public float X { get; set; }
        public float Y { get; set; }
        public byte[,] Tiles { get; private set; }

        public bool Contains(int x, int y)
        {
            return x > _x && x < _x + _size && y > _y && y < _y + _size;
        }

        public void SetTile(int x, int y, byte tile)
        {
            int gridX = (x - _x) / 40;
            int gridY = (y - _y) / 40;
            Tiles[gridX, gridY] = tile;
        }

        public void Draw(Graphics g)
        {
            for (int i = 0; i <= Constants.GridSize; i++)
                g.DrawLine(Pens.Black, new Point(_x + i * 40, _y), new Point(_x + i * 40, _y + _size));

            for (int j = 0; j <= Constants.GridSize; j++)
                g.DrawLine(Pens.Black, new Point(_x, _y + j * 40), new Point(_x + _size, _y + j * 40));


            for (int i = 0; i < Constants.GridSize; i++)
            {
                for (int j = 0; j < Constants.GridSize; j++)
                {
                    if (Tiles[i, j] > 0)
                    {
                        g.DrawImage(Utils.GetBitmap(Tiles[i, j]), _x + i * 40, _y + j * 40);
                    }
                }
            }
        }


    }
}
