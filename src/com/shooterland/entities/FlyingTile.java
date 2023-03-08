package com.shooterland.entities;

import android.graphics.Canvas;

import com.shooterland.enums.*;
import com.shooterland.framework.AbstractEntity;
import com.shooterland.framework.SL;
import com.shooterland.framework.Utils;
import com.shooterland.states.GameState;

public class FlyingTile extends AbstractEntity
{
	private Tile _tile;
	private int _targetRow, _targetCol;
	private float _x, _y, _targetX, _targetY;
	private float _speed;
	private GameState _gameState;
	private boolean _movingLeft;
	
	public FlyingTile(GameState gameState, Tile tile, float x, float y, float targetX, float targetY, int targetRow, int targetCol)
	{
		_gameState = gameState;
		_tile = tile;
		_x = x;
		_y = y;
		_targetX = targetX;
		_targetY = targetY;
		_targetRow = targetRow;
		_targetCol = targetCol;
		
		if (targetX != x)
		{
			_speed = (float)SL.GridHeight * (float)SL.GridSquareSize * 3.2f;
			_movingLeft = true;
		}
		else if (targetY != y)
		{
			_speed = (float)SL.GridHeight * (float)SL.GridSquareSize * 3.2f;
			_movingLeft = false;
		}
	}
	
	@Override
	public void draw(Canvas canvas) 
	{
		canvas.drawBitmap(_tile.getBitmap(), _x, _y, null);
	}

	@Override
	public void update(float dt) 
	{
		if (_x > _targetX)
		{
			_x -= _speed * dt;
			if (_x < _targetX)
				_x = _targetX;
		}
		
		if (_y > _targetY)
		{
			_y -= _speed * dt;
			if (_y < _targetY)
				_y = _targetY;
		}
	}
	
	@Override
	public boolean isDead() 
	{
		return _x == _targetX && _y == _targetY;
	}
	
	public boolean movingLeft()
	{
		return _movingLeft;
	}
	
	public float getX()
	{
		return _x;
	}
	
	public float getY()
	{
		return _y;
	}
	
	public int getTargetRow()
	{
		return _targetRow;
	}
	
	public int getTargetCol()
	{
		return _targetCol;
	}
	
	public Tile getTile()
	{
		return _tile;
	}
	
}
