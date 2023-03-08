package com.shooterland.entities;

import java.util.ArrayList;

import android.graphics.Canvas;
import android.graphics.Point;
import android.graphics.Rect;
import android.location.Location;

import com.shooterland.enums.*;
import com.shooterland.framework.SL;
import com.shooterland.framework.Utils;
import com.shooterland.states.GameState;

public class Grid
{
	private GameState _state;
	private Rect _pixelBounds;
	private Tile[][] _tiles;
	private boolean [][] _visit;
	
	public Grid(GameState state)
	{
		_state = state;
		_tiles = new Tile[SL.GridWidth][SL.GridHeight];
		_visit = new boolean[SL.GridWidth][SL.GridHeight];
		reset();
		
		int padding = (int)(SL.ScreenHeight * 0.015f);
		
		_pixelBounds = new Rect();
		_pixelBounds.top = padding;
		_pixelBounds.left = SL.GameAreaX + padding;
		_pixelBounds.bottom = _pixelBounds.top + SL.GridHeight * SL.GridSquareSize;
		_pixelBounds.right = _pixelBounds.left + SL.GridWidth * SL.GridSquareSize;
	}
	
	/**
	 * Gets the grid coordinates in which the given pixel point lies.
	 */
	public Point getGridSquare(float pixelX, float pixelY)
	{
		Point p = new Point();
		p.x =  ((int)pixelX - _pixelBounds.left) / SL.GridSquareSize;
		p.y = ((int)pixelY - _pixelBounds.top) / SL.GridSquareSize;
		return p;
	}
	
	public boolean isInBounds(float pixelX, float pixelY)
	{
		return _pixelBounds.contains((int)pixelX, (int)pixelY);
	}
	
	public boolean isInGridBounds(int x, int y)
	{
		return x >= 0 && x < SL.GridWidth && y >= 0 && y < SL.GridHeight;
	}
	
	public Rect getPixelBounds()
	{
		return _pixelBounds;
	}
	
	public int getPixelX(int gridX)
	{
		return _pixelBounds.left + gridX * SL.GridSquareSize;
	}
	
	public int getPixelY(int gridY)
	{
		return _pixelBounds.top + gridY * SL.GridSquareSize;
	}
	
	public int getGridX(float pixelX)
	{
		return ((int)pixelX - _pixelBounds.left) / SL.GridSquareSize; 
	}
	
	public int getGridY(float pixelY)
	{
		return ((int)pixelY - _pixelBounds.top) / SL.GridSquareSize; 
	}
	
	public void setTile(int gridX, int gridY, Tile tile)
	{
		_tiles[gridX][gridY] = tile;
	}
	
	public Tile getTile(int gridX, int gridY)
	{
		return _tiles[gridX][gridY];
	}
	
	public Tile getTile(float pixelX, float pixelY)
	{
		return _tiles[getGridX(pixelX)][getGridY(pixelY)];
	}
	
	/**
	 * Gets the left-most column with an empty space in the given row. Returns -1
	 * if the row is full.
	 */
	public int getFirstOpenColumn(int row)
	{
		for (int i = SL.GridWidth - 1; i >= 0; i--)
		{
			//Check if row is full
			if (!_tiles[i][row].isEmpty())
				return -1;
			
			//We reached the end of the row
			if (i == 0)
				return 0;
			
			if (_tiles[i][row].isEmpty() && !_tiles[i-1][row].isEmpty())
				return i;
		}
		
		return -1; //impossible
	}
	
	/**
	 * Gets the top-most row with an empty space in the given column. Returns -1
	 * if the column is full.
	 */
	public int getFirstOpenRow(int column)
	{
		for (int i = SL.GridHeight - 1; i >= 0; i--)
		{
			//Check if column is full
			if (!_tiles[column][i].isEmpty())
				return -1;
			
			//We've reached the top of the column
			if (i == 0)
				return 0;
			
			if (_tiles[column][i].isEmpty() && !_tiles[column][i-1].isEmpty())
				return i;
		}
		
		return -1; //impossible
	}
	
	public void draw(Canvas canvas, float dt) 
	{
		for (int col = 0; col <= SL.GridWidth; col++)
		{
			canvas.drawLine(getPixelX(col), _pixelBounds.top, getPixelX(col), _pixelBounds.bottom, SL.Graphics.GridPaint);
		}
			
		for (int row = 0; row <= SL.GridHeight; row++)
		{
			canvas.drawLine(_pixelBounds.left, getPixelY(row), _pixelBounds.right, getPixelY(row), SL.Graphics.GridPaint);
		}
					
		for (int i = 0; i < SL.GridWidth; i++)
		{
			for (int j = 0; j < SL.GridHeight; j++)
			{
				float x = getPixelX(i);
				float y = getPixelY(j);
				if (!_tiles[i][j].isEmpty())
					canvas.drawBitmap(_tiles[i][j].getBitmap(), getPixelX(i), getPixelY(j), null);
				
				if (_tiles[i][j].isBaddie())
					canvas.drawRect(x, y, x + 39, y + 39, SL.Graphics.BaddieSquarePaint);
			}
		}
	}
		
	/**
	 * Returns an ArrayList of points that comprises a combo at the given point, or
	 * returns null if there is no combo there.
	 */
	public ArrayList<Point> getComboAt(int gridX, int gridY)
	{
		ArrayList<Point> combo = new ArrayList<Point>();
		traverse(gridX, gridY, _tiles[gridX][gridY], combo);
		resetVisitArray();
		
		if (combo.size() >= 3)
			return combo;
		return null;
	}
	
	private void traverse(int x, int y, Tile tile, ArrayList<Point> points)
	{
		if (_tiles[x][y] != tile)
			return;
		
		points.add(new Point(x, y));
		_visit[x][y] = true;
		
		//left
		if (isInGridBounds(x-1, y) && !_visit[x-1][y])
			traverse(x-1, y, tile, points);
		
		//right
		if (isInGridBounds(x+1, y) && !_visit[x+1][y])
			traverse(x+1, y, tile, points);
		
		//up
		if (isInGridBounds(x, y-1) && !_visit[x][y-1])
			traverse(x, y-1, tile, points);
		
		//down
		if (isInGridBounds(x, y+1) && !_visit[x][y+1])
			traverse(x, y+1, tile, points);
	}

	public void highlightRow(Canvas canvas, int row)
	{
		canvas.drawLine(_pixelBounds.left, getPixelY(row), _pixelBounds.right, getPixelY(row), SL.Graphics.RedPaint);
		canvas.drawLine(_pixelBounds.left, getPixelY(row) + SL.GridSquareSize, _pixelBounds.right, getPixelY(row) + SL.GridSquareSize, SL.Graphics.RedPaint);
	}
	
	public void highlightColumn(Canvas canvas, int col)
	{
		canvas.drawLine(getPixelX(col), _pixelBounds.top, getPixelX(col), _pixelBounds.bottom, SL.Graphics.RedPaint);
		canvas.drawLine(getPixelX(col) + SL.GridSquareSize, _pixelBounds.top, getPixelX(col) + SL.GridSquareSize, _pixelBounds.bottom, SL.Graphics.RedPaint);
	}
	
	public void update(float dt) 
	{
		
	}
	
	private void reset()
	{
		for (int i = 0; i < SL.GridWidth; i++)
		{
			for (int j = 0; j < SL.GridHeight; j++)
			{
				_tiles[i][j] = Tile.Empty;
			}
		}
	}	
	
	private void resetVisitArray()
	{
		for (int i = 0; i < SL.GridWidth; i++)
		{
			for (int j = 0; j < SL.GridHeight; j++)
			{
				_visit[i][j] = false;
			}
		}
	}
}
