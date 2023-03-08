package com.shooterland.states;

import android.graphics.Canvas;
import android.view.Menu;

import com.shooterland.enums.MenuOption;
import com.shooterland.framework.AbstractState;
import com.shooterland.framework.SL;
import com.shooterland.framework.Utils;

public class DefeatState extends AbstractState 
{
	@Override
	public void buildMenu(Menu menu) 
	{
		MenuOption.Achievements.addToMenu(menu);
		MenuOption.Stats.addToMenu(menu);
		MenuOption.ToggleSound.addToMenu(menu);
		MenuOption.Help.addToMenu(menu);
	}

	@Override
	public void draw(Canvas canvas, float dt) 
	{
		canvas.drawBitmap(SL.Graphics.WorldBackgrounds[SL.Session.World - 1], SL.GameAreaX, 0, null);
		Utils.fillExtraSideSpace(canvas);
	}

	@Override
	public void enterState() 
	{
	}

	@Override
	public void leaveState() 
	{
	}

	@Override
	public void update(float dt) 
	{
	}
	
	@Override
	public boolean isFinished() 
	{
		return true;
	}
}
