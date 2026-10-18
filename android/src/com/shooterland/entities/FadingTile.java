package com.shooterland.entities;

import android.graphics.Canvas;
import android.graphics.Paint;

import com.shooterland.enums.*;
import com.shooterland.framework.AbstractEntity;
import com.shooterland.framework.SL;

public class FadingTile extends AbstractEntity
{
	private Tile _tile;
	private Paint _paint;
	private float _x, _y;
	private float _alpha;
	
	public FadingTile(Tile tile, float x, float y)
	{
		_tile = tile;
		_x = x;
		_y = y;
		_paint = new Paint();
		_paint.setARGB(255, 255, 255, 255);
		_alpha = 255.0f;
	}
		
	@Override
	public void update(float dt)
	{
		_alpha -= 400.0f * dt;
		if (_alpha < 0.0f)
			_alpha = 0.0f;
		
		_paint.setAlpha((int)_alpha);
	}
	
	@Override
	public void draw(Canvas canvas)
	{
		canvas.drawBitmap(_tile.getBitmap(), _x, _y, _paint);
	}

	@Override
	public boolean isDead() 
	{
		return _alpha == 0.0f;
	}
}
