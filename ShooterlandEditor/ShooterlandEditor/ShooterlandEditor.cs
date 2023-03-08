using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Windows.Forms;
using System.IO;

namespace ShooterlandEditor
{
    public partial class ShooterlandEditor : Form
    {
        private Grid _grid;
        private TileSelector _tileSelector;
        private string _fileName;
        private bool _dirty = false;

        public ShooterlandEditor()
        {
            InitializeComponent();
            _grid = new Grid(20, 120);
            _tileSelector = new TileSelector(480, 120);
            rightSingleCheck.Checked = true;
            bottomSingleCheck.Checked = true;
            MaximumSize = MinimumSize = Size;
            MaximizeBox = false;

            DoubleBuffered = true;
            frameTimer.Interval = 1000 / 40;
            frameTimer.Start();
        }

        private void Update(object sender, EventArgs e)
        {
            Invalidate();
        }

        private void Draw(object sender, PaintEventArgs e)
        {
            _grid.Draw(e.Graphics);
            _tileSelector.Draw(e.Graphics);
        }

        private void ShooterlandEditor_MouseClick(object sender, MouseEventArgs e)
        {
            if (_tileSelector.Contains(e.X, e.Y))
            {
                _tileSelector.onClick(e.X, e.Y, e.Button);
            }

            if (_grid.Contains(e.X, e.Y))
            {
                byte tile = e.Button == MouseButtons.Left ? _tileSelector.LeftClickSelection : _tileSelector.RightClickSelection;
                _grid.SetTile(e.X, e.Y, tile);
                _dirty = true;
            }
        }

        private void rightDoubleCheck_CheckedChanged(object sender, EventArgs e)
        {
            if (rightDoubleCheck.Checked)
                rightSingleCheck.Checked = false;
        }

        private void rightSingleCheck_CheckedChanged(object sender, EventArgs e)
        {
            if (rightSingleCheck.Checked)
                rightDoubleCheck.Checked = false;
        }

        private void bottomDoubleCheck_CheckedChanged(object sender, EventArgs e)
        {
            if (bottomDoubleCheck.Checked)
                bottomSingleCheck.Checked = false;
        }

        private void bottomSingleCheck_CheckedChanged(object sender, EventArgs e)
        {
            if (bottomSingleCheck.Checked)
                bottomDoubleCheck.Checked = false;
        }

        private void loadButton_Click(object sender, EventArgs e)
        {
            if (_dirty)
            {
                DialogResult result1 = MessageBox.Show("You have unsaved changed. Are you sure you wish to discard them?",
                    "Unsaved changes", MessageBoxButtons.YesNo, MessageBoxIcon.Warning);

                if (result1 != DialogResult.Yes)
                    return;
            }

            OpenFileDialog ofd = new OpenFileDialog();
            DialogResult result2 = ofd.ShowDialog();

            if (result2 == DialogResult.OK)
            {
                SetCurrentFile(ofd.FileName);
            }

            if (_fileName != null)
                load();
        }

        private void saveButton_Click(object sender, EventArgs e)
        {
            if (_fileName == null)
            {
                SaveFileDialog sfd = new SaveFileDialog();
                DialogResult result = sfd.ShowDialog();

                if (result == DialogResult.OK)
                {
                    SetCurrentFile(sfd.FileName);
                }
            }

            if (_fileName != null)
                save();
        }

        private void SetCurrentFile(string file)
        {
            _fileName = file;
            int index = _fileName.LastIndexOf('\\') + 1;
            Text = _fileName.Substring(index, _fileName.Length - index - 1) + " - Shooterland Editor";
            _dirty = false;
        }

        private void save()
        {
            FileStream fs = File.Create(_fileName);
            BinaryWriter bw = new BinaryWriter(fs);

            bw.Write(bottomDoubleCheck.Checked ? (byte)1 : (byte)0);
            bw.Write(rightDoubleCheck.Checked ? (byte)1 : (byte)0);

            bw.Write((byte)initialDelayField.Value);
            bw.Write((byte)delayField.Value);
            bw.Write((byte)ttbField.Value);

            for (int i = 0; i < Constants.GridSize; i++)
            {
                for (int j = 0; j < Constants.GridSize; j++)
                {
                    bw.Write(_grid.Tiles[i, j]);
                }
            }

            bw.Close();
            fs.Close();
        }

        private void load()
        {
            FileStream fs = File.Open(_fileName, FileMode.Open);
            BinaryReader br = new BinaryReader(fs);

            bottomDoubleCheck.Checked = br.ReadByte() == 1;
            rightDoubleCheck.Checked = br.ReadByte() == 1;

            initialDelayField.Value = br.ReadByte();
            delayField.Value = br.ReadByte();
            ttbField.Value = br.ReadByte();

            for (int i = 0; i < Constants.GridSize; i++)
            {
                for (int j = 0; j < Constants.GridSize; j++)
                {
                    _grid.Tiles[i, j] = br.ReadByte();
                }
            }

            br.Close();
            fs.Close();
        }
    }
}
