package com.shooterland.framework;

import android.graphics.Canvas;

public abstract class AbstractEntity 
{
	public abstract void update(float dt);
	public abstract void draw(Canvas canvas);
	public abstract boolean isDead();
}
