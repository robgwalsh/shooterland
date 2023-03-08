package com.shooterland.states;

import android.graphics.Canvas;
import android.graphics.Rect;
import android.view.Menu;

import com.shooterland.entities.Button;
import com.shooterland.entities.MainMenuButton;
import com.shooterland.enums.MenuOption;
import com.shooterland.framework.AbstractState;
import com.shooterland.framework.SL;

public class WorldMapState extends AbstractState 
{
	private Button _menuButton;
	private Button _playButton;
	
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
		canvas.drawRect(new Rect(0, 0, SL.ScreenWidth, SL.ScreenHeight), SL.Graphics.BlackPaint);
		
		int size = 15;

		for (int x = 0; x <= SL.ScreenWidth; x += size)
			canvas.drawLine(x, 0, x, SL.ScreenHeight, SL.Graphics.DarkGreenPaint);
		for (int y = 0; y <= SL.ScreenHeight; y += size)
			canvas.drawLine(0, y, SL.ScreenWidth, y, SL.Graphics.DarkGreenPaint);
		
		canvas.drawBitmap(SL.Graphics.WorldMapBackground, SL.GameAreaX, 0, null);
		
		_menuButton.draw(canvas);
		_playButton.draw(canvas);
	}

	@Override
	public void enterState() 
	{
		_menuButton = new Button(SL.Graphics.WorldMapButtonBack, "Back", (float)SL.GameAreaX + (float)SL.GameAreaWidth * 0.2f, (float)SL.GameAreaHeight * 0.86f);
		_playButton = new Button(SL.Graphics.WorldMapButtonForward, "Play", (float)SL.GameAreaX + (float)SL.GameAreaWidth * 0.8f, (float)SL.GameAreaHeight * 0.86f);
	}

	@Override
	public void leaveState() 
	{
	}

	@Override
	public void update(float dt) 
	{
		if (_menuButton.isClicked() || SL.Input.isBackClicked())
		{
			SL.enterState(new MainMenuState(false));
			return;
		}
		else if (_playButton.isClicked())
		{
			SL.enterState(new OverworldState());
			return;
		}
	}

	@Override
	public boolean isFinished() 
	{
		return true;
	}

}
