package com.shooterland.entities;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Rect;

import com.shooterland.enums.*;
import com.shooterland.framework.SL;
import com.shooterland.states.GameState;

public class Shooter 
{
	public static Paint BubblePaint;
	
	private float _x = 0.0f;
	private float _y = 0.0f;
	private int _gridCoord = 0;
	private Bitmap _bitmap;
	private Tile _tile;
	private ShooterType _shooterType;
	private Grid _grid;
	private GameState _gameState;
	
	public Shooter(GameState gameState, Grid grid, ShooterType shooterType)
	{
		_gameState = gameState;
		_grid = grid;
		_tile = Tile.Empty;
		_shooterType = shooterType;
		
		if (_shooterType == ShooterType.SingleBottom)
			_bitmap = SL.Graphics.BottomShooter;
		else if (_shooterType == ShooterType.SingleRight)
			_bitmap = SL.Graphics.RightShooter;
	}
	
	public void moveTo(int gridCoord, float x, float y)
	{
		_gridCoord = gridCoord;
		_x = x;
		_y = y;
	}
	
	public boolean canShoot()
	{
		if (_shooterType == ShooterType.SingleRight)
		{
			return _grid.getTile(SL.GridWidth - 1, _gridCoord).isEmpty();
		}
		else if (_shooterType == ShooterType.SingleBottom)
		{
			return _grid.getTile(_gridCoord, SL.GridHeight - 1).isEmpty();
		}
		return false;
	}
	
	public ShooterType getShooterType()
	{
		return _shooterType;
	}
	
	public Tile getTile()
	{
		return _tile;
	}
	
	public void setTile(Tile tile)
	{
		_tile = tile;
	}
	
	public float getX()
	{		
		return _x;
	}
	
	public float getY()
	{
		return _y;
	}
	
	public int getGridCoord()
	{
		return _gridCoord;
	}
	
	/**
	 * Tries to drop an item at the given coordinates. Returns whether or not
	 * the coordinates fall within the shooter and the item will be accepted.
	 */
	public boolean tryDropItem(Tile item, int x, int y)
	{
		Rect rect = new Rect();
		rect.left = (int)getBubbleX();
		rect.top = (int)getBubbleY();
		rect.right = rect.left + SL.Graphics.Bubble.getWidth();
		rect.bottom = rect.top + SL.Graphics.Bubble.getHeight();
		
		if (rect.contains(x, y))
		{
			setTile(item);
			return true;	
		}
		return false;
	}
	
	public void draw(Canvas canvas, float dt) 
	{
		if (_gameState.isStoreShowing())
		{
			canvas.drawBitmap(SL.Graphics.Bubble, getBubbleX(), getBubbleY(), BubblePaint);
		}
		
		canvas.drawBitmap(_bitmap, _x, _y, null);
		
		if (!_tile.isEmpty() && !_gameState.isStoreShowing())
		{
			canvas.drawBitmap(_tile.getBitmap(), _x, _y, null);
		}
	}

	private float getBubbleX()
	{
		if (_shooterType == ShooterType.SingleBottom)
		{
			return _x + ((float)SL.Graphics.BottomShooter.getWidth() / 2.0f) - ((float)SL.Graphics.Bubble.getWidth() / 2.0f);
		}
		else if (_shooterType == ShooterType.SingleRight)
		{
			return _x + (float)SL.Graphics.RightShooter.getWidth() - (float)SL.Graphics.Bubble.getHeight();
		}
		return 0;
	}
	
	private float getBubbleY()
	{
		if (_shooterType == ShooterType.SingleBottom)
		{
			return _y + (float)SL.Graphics.BottomShooter.getWidth() - (float)SL.Graphics.Bubble.getWidth();
		}
		else if (_shooterType == ShooterType.SingleRight)
		{
			return _y + ((float)SL.Graphics.RightShooter.getHeight() / 2.0f) - ((float)SL.Graphics.Bubble.getHeight() / 2.0f);
		}
		return 0;
	}
	
	static
	{
		if (BubblePaint == null)
		{
			BubblePaint = new Paint();
			BubblePaint.setARGB(150, 255, 255, 255);
		}
	}
}
