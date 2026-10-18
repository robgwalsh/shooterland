package com.shooterland.entities;

import com.shooterland.framework.SL;

import android.graphics.Bitmap;

public class MainMenuButton extends Button 
{
	private float _targetY;
	
	public MainMenuButton(Bitmap bitmap, String text, float x, float y) 
	{
		super(bitmap, text, x, - 50);
		_targetY = y;
	}

	public void update(float dt)
	{
		_y += (float)SL.ScreenHeight * 2.0f * dt;
		if (_y >= _targetY)
		{
			_y = _targetY;
		}
	}
	
}
