package com.shooterland.entities;

import android.graphics.Canvas;

import com.shooterland.framework.SL;
import com.shooterland.framework.Utils;
import com.shooterland.states.GameState;

public class Roscoe 
{
	private enum RoscoeState
	{
		InTrunk,
		MovingToPiggy,
		MovingToTrunk
	}
	
	private RoscoeState _state;
	private float _waitTime;		//time before initially leaving the trunk
	private float _travelTime;		//time to get from trunk to piggy and visa versa
	private float _timeCreated;
	private float _x, _y;
	private float _speed;
	private float _trunkY, _piggyY;
	private GameState _gameState;
	
	public Roscoe(GameState gameState, float waitTime, float travelTime, float x)
	{
		_gameState = gameState;
		_state = RoscoeState.InTrunk;
		_waitTime = waitTime;
		_travelTime = travelTime;
		_timeCreated = SL.GameTime;
		_piggyY = Utils.getPercentOfScreenHeight(0.14f);
		_trunkY = Utils.getPercentOfScreenHeight(0.8f);
		_speed = (_trunkY - _piggyY) / _travelTime;
		_x = x;
		_y = _trunkY;
	}
	
	public void update(float dt)
	{
		if (_state == RoscoeState.InTrunk)
		{
			if (Utils.timeSince(_timeCreated) > _waitTime)
			{
				_state = RoscoeState.MovingToPiggy;
			}
		}
		else if (_state == RoscoeState.MovingToPiggy)
		{
			_y -= _speed * dt;
			if (_y <= _piggyY)
			{
				_y = _piggyY;
				_state = RoscoeState.MovingToTrunk;
				_gameState.onRoscoeReachedPiggy();
			}
		}
		else if (_state == RoscoeState.MovingToTrunk)
		{
			_y += _speed * dt;
			if (_y >= _trunkY)
			{
				_y = _trunkY;
				_state = RoscoeState.MovingToPiggy;
			}
		}
	}
	
	public void draw(Canvas canvas, float dt)
	{
		int i = (int)(SL.GameTime * 1000.0f) % 700;
		
		if (_state == RoscoeState.MovingToPiggy)
		{
			if (_gameState.isPaused() || i > 350)
				canvas.drawBitmap(SL.Graphics.RoscoeUp1, _x, _y, null);
			else
				canvas.drawBitmap(SL.Graphics.RoscoeUp2, _x, _y, null);
		}
		else if (_state == RoscoeState.MovingToTrunk)
		{
			if (_gameState.isPaused() || i > 350)
				canvas.drawBitmap(SL.Graphics.RoscoeDown1, _x, _y, null);
			else
				canvas.drawBitmap(SL.Graphics.RoscoeDown2, _x, _y, null);
		}
	}
	
	
}
