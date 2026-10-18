using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Drawing;
using System.Windows.Forms;

namespace ShooterlandEditor
{
    public class TileSelector
    {
        private int _x, _y;
        private int _leftClickX, _leftClickY, _rightClickX, _rightClickY;

        public TileSelector(int x, int y)
        {
            _x = x;
            _y = y;

            _leftClickX = _x;
            _leftClickY = _y + 170;

            _rightClickX = _leftClickX + 42;
            _rightClickY = _leftClickY;
        }

        public byte LeftClickSelection { get; private set; }
        public byte RightClickSelection { get; private set; }

        public bool Contains(int x, int y)
        {
            return x >= _x && x <= _x + 5 * 40 && y >= _y && y <= _y + 4 * 40;
        }

        public void onClick(int x, int y, MouseButtons button)
        {
            int s = (((y - _y) - ((y - _y)) % 40) / 40) * 5 + (((x - _x) - ((x - _x)) % 40) / 40);
            byte selection = (byte)s;
            
            if (selection > Constants.NumTiles) 
                selection = 0;

            if (button == MouseButtons.Left)
                LeftClickSelection = selection;
            else if (button == MouseButtons.Right)
                RightClickSelection = selection;
        }

        public void Draw(Graphics g)
        {
            for (int i = 1; i <= Constants.NumTiles; i++)
            {
                Point p = new Point(_x + (i % 5) * 40,
                                    _y + (i / 5) * 40);
                g.DrawImage(Utils.GetBitmap(i), p);
            }

            g.DrawRectangle(Pens.Black, _leftClickX - 1, _leftClickY - 1, 42, 42);
            g.DrawRectangle(Pens.Black, _rightClickX - 1, _rightClickY - 1, 42, 42);

            if (LeftClickSelection != 0)
                g.DrawImage(Utils.GetBitmap(LeftClickSelection), _leftClickX, _leftClickY);

            if (RightClickSelection != 0)
                g.DrawImage(Utils.GetBitmap(RightClickSelection), _rightClickX, _rightClickY);
        }
    }
}
