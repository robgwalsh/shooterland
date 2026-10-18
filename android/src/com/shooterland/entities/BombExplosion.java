package com.shooterland.entities;

import com.shooterland.framework.AbstractEntity;
import com.shooterland.framework.SL;
import com.shooterland.framework.Utils;

import android.graphics.Canvas;

public class BombExplosion extends AbstractEntity
{
	private int _currentFrame = 1;
	private float _startedFrame;
	private float _x, _y;
	
	public BombExplosion(float f, float g)
	{
		_x = f;
		_y = g;
		_startedFrame = SL.GameTime;
	}
	
	@Override
	public void draw(Canvas canvas)
	{
		if (!isDead())
		{
			canvas.drawBitmap(SL.Graphics.BombFrames[_currentFrame], _x, _y, null);
		}
	}
	
	@Override
	public void update(float dt)
	{
		if (Utils.timeSince(_startedFrame) > 0.1f)
			_currentFrame++;
	}

	@Override
	public boolean isDead() {
		
		return _currentFrame >= 11;
	}
}
