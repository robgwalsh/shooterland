package com.shooterland.entities;

import java.util.Enumeration;
import java.util.HashSet;
import java.util.Hashtable;

import com.shooterland.enums.Tile;
import com.shooterland.framework.SL;
import com.shooterland.framework.Utils;
import com.shooterland.states.GameState;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Rect;

public class Store 
{
	public static Paint SelectedPaint;
	
	public boolean IsShowing;
	private GameState _gameState;
	
	private Hashtable<Tile, Rect> _collisionRects = new Hashtable<Tile, Rect>();
	private Tile _selectedTile;
	
	public Store(GameState gameState)
	{
		_gameState = gameState;
		
		_collisionRects.put(Tile.Weight_1, Utils.BuildCollisionRect(0.70f, 0.39f, 0.13f, 0.12f));
		_collisionRects.put(Tile.Weight_2, Utils.BuildCollisionRect(0.70f, 0.54f, 0.13f, 0.12f));
		_collisionRects.put(Tile.Weight_3, Utils.BuildCollisionRect(0.70f, 0.69f, 0.13f, 0.12f));
		_collisionRects.put(Tile.Bomb, Utils.BuildCollisionRect(0.70f, 0.84f, 0.13f, 0.12f));
		
		_collisionRects.put(Tile.Ramp_BottomRight, Utils.BuildCollisionRect(0.84f, 0.39f, 0.13f, 0.12f));
		_collisionRects.put(Tile.Ramp_BottomLeft, Utils.BuildCollisionRect(0.84f, 0.54f, 0.13f, 0.12f));
		_collisionRects.put(Tile.Ramp_UpRight, Utils.BuildCollisionRect(0.84f, 0.69f, 0.13f, 0.12f));
		_collisionRects.put(Tile.Ramp_UpLeft, Utils.BuildCollisionRect(0.84f, 0.84f, 0.13f, 0.12f));
	}
	
	public void draw(Canvas canvas)
	{
		if (!IsShowing)
			return;
		
		canvas.drawBitmap(SL.Graphics.StoreBackground, (float)SL.GameAreaX + (float)SL.GameAreaWidth * 0.687f, (float)SL.GameAreaHeight * 0.21f, null);
		
		if (_selectedTile != null)
		{
			Rect rect = _collisionRects.get(_selectedTile);
			canvas.drawRect(rect, SelectedPaint);
		}
		
		/**
		Enumeration<Tile> keys = _collisionRects.keys();
		while (keys.hasMoreElements()) 
		{
			Tile key = keys.nextElement();
			canvas.drawRect(_collisionRects.get(key), SL.Graphics.RedPaint);
			break;
		}*/
	}
	
	public void update(float dt)
	{
		if (!IsShowing)
			return;
		
		if (SL.Input.isMouseClicked())
		{
			Enumeration<Tile> keys = _collisionRects.keys();
			while (keys.hasMoreElements()) 
			{
				Tile key = keys.nextElement();
				if (SL.Input.isClicked(_collisionRects.get(key)))
				{
					_selectedTile = key;
				}
			}
		}
		
		if (_selectedTile != null && !SL.Input.isMouseDown())
		{
			if (_gameState.onDraggedTileReleased(_selectedTile, SL.Input.getMouseX(), SL.Input.getMouseY()))
			{
				IsShowing = false;
				_gameState.getGameMenu().setMoney(_gameState.getGameMenu().getMoney() - getItemCost(_selectedTile));
				_selectedTile = null;
				return;
			}
			else
			{
				_selectedTile = null;
			}
		}
		
		if (SL.Input.isBackClicked())
		{
			IsShowing = false;
			return;
		}
	}
	
	private int getItemCost(Tile tile)
	{
		if (tile == Tile.Bomb)
			return 3;
		if (tile == Tile.Ramp_BottomLeft)
			return 2;
		if (tile == Tile.Ramp_BottomRight)
			return 2;
		if (tile == Tile.Ramp_UpLeft)
			return 2;
		if (tile == Tile.Ramp_UpRight)
			return 2;
		if (tile == Tile.Weight_1)
			return 2;
		if (tile == Tile.Weight_2)
			return 3;
		if (tile == Tile.Weight_3)
			return 4;
		return 0;
	}
	
	static
	{
		SelectedPaint = new Paint();
		SelectedPaint.setARGB(255, 56, 56, 56);
	}
}
