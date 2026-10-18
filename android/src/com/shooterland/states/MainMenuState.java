package com.shooterland.states;

import java.util.ArrayList;

import android.graphics.Canvas;
import android.graphics.Paint;
import android.view.Menu;

import com.shooterland.entities.Button;
import com.shooterland.entities.MainMenuButton;
import com.shooterland.entities.Store;
import com.shooterland.enums.MenuOption;
import com.shooterland.framework.*;

public class MainMenuState extends AbstractState
{	
	private ArrayList<MainMenuButton> _buttons = new ArrayList<MainMenuButton>();
	private float _alpha;
	private Paint _backgroundPaint;

	public MainMenuState(boolean fromLoadScreen)
	{
		_buttons.add(new MainMenuButton(SL.Graphics.MenuButtonForward, "Play", (float)SL.ScreenWidth * 0.85f, (float)SL.ScreenHeight * 0.83f));
		_buttons.add(new MainMenuButton(SL.Graphics.MenuButtonBack, "Quit", (float)SL.ScreenWidth * 0.15f, (float)SL.ScreenHeight * 0.83f));
		_buttons.add(new MainMenuButton(SL.Graphics.MenuButtonRound, "Clear Data", SL.ScreenCenterX, (float)SL.ScreenHeight * 0.83f));
		
		_alpha = fromLoadScreen ? 0.0f : 255.0f;
		_backgroundPaint = new Paint();
	}
	
	
	@Override
	public void enterState() 
	{
		SL.Sound.playMenuMusic();
	}

	@Override
	public void leaveState() 
	{
	}

	@Override
	public void update(float dt) 
	{
		_alpha += 300.0f * dt;
		if (_alpha > 350.0f)
		{
			for (MainMenuButton button : _buttons)
			{
				button.update(dt);
				if (button.isClicked())
				{
					if (button.getText() == "Quit")
					{
						System.exit(0);
					}
					else if (button.getText() == "Play")
					{
						SL.enterState(new WorldMapState());
					} 
					else if (button.getText() == "Clear Data")
					{
						if (SL.showPrompt("Are you sure you wish to clear Shooterland application data? All saved progress will be lost."))
						{
							SL.Session.resetSaveFile();
						}
					}
					break;
				}
			}
		}
	}

	@Override
	public void draw(Canvas canvas, float dt) 
	{
		if (_alpha < 255.0f)
		{
			Utils.drawLoadScreen(canvas);
			_backgroundPaint.setARGB(Math.min(255, (int)_alpha), 255, 255, 255);
			canvas.drawBitmap(SL.Graphics.MainMenuBackground, 0, 0, _backgroundPaint);
		}
		else
		{
			canvas.drawBitmap(SL.Graphics.MainMenuBackground, 0, 0, null);
		}
				
		for (MainMenuButton button : _buttons)
		{
			button.draw(canvas);
		}
	}

	@Override
	public void buildMenu(Menu menu) 
	{
		MenuOption.Achievements.addToMenu(menu);
		MenuOption.Stats.addToMenu(menu);
		MenuOption.ToggleSound.addToMenu(menu);
		MenuOption.Help.addToMenu(menu);
	}
	
	@Override
	public boolean isFinished() 
	{
		return true;
	}
}
