package com.shooterland.framework;

import android.graphics.Canvas;
import android.view.Menu;

public abstract class AbstractState 
{
	public abstract void update(float dt);
	public abstract void draw(Canvas canvas, float dt);
	public abstract void enterState();
	public abstract void leaveState();	
	public abstract void buildMenu(Menu menu);
	public abstract boolean isFinished();
}
