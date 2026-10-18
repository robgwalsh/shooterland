package com.shooterland.states;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Point;
import android.graphics.Rect;
import android.graphics.Paint.Align;
import android.view.Menu;
import android.widget.Toast;

import com.shooterland.entities.Button;
import com.shooterland.entities.MainMenuButton;
import com.shooterland.enums.MenuOption;
import com.shooterland.framework.*;

public class OverworldState extends AbstractState
{	
	private Paint _connectorPaint;
	private Paint _levelNumberPaint;
	private Paint _selectedLevelPaint;
	private Point[] _levelPoints;
	private float _levelPointRadius;
	private String _selectedLevelString;
	private Button _backButton;
	private Button _playButton;
	
	public OverworldState()
	{
		_levelPointRadius =  (float)SL.GameAreaHeight * 0.03f;
		selectLevel(1);
		
		_connectorPaint = new Paint();
		_connectorPaint.setARGB(255, 86, 53, 13);
		_connectorPaint.setAntiAlias(true);
		_connectorPaint.setStrokeWidth(2.0f);
		
		_levelNumberPaint = new Paint();
		_levelNumberPaint.setARGB(255, 255, 255, 255);
		_levelNumberPaint.setAntiAlias(true);
		_levelNumberPaint.setTextAlign(Align.CENTER);
		
		_selectedLevelPaint = new Paint();
		_selectedLevelPaint.setARGB(255, 255, 255, 255);
		_selectedLevelPaint.setAntiAlias(true);
		_selectedLevelPaint.setTextAlign(Align.CENTER);
		_selectedLevelPaint.setTextSize((float)SL.GameAreaHeight * 0.06f);
		
		_backButton = new Button(SL.Graphics.WorldMapButtonBack, "Back", (float)SL.GameAreaX + (float)SL.GameAreaWidth * 0.2f, (float)SL.GameAreaHeight * 0.86f);
		_playButton = new Button(SL.Graphics.WorldMapButtonForward, "Play", (float)SL.GameAreaX + (float)SL.GameAreaWidth * 0.8f, (float)SL.GameAreaHeight * 0.86f);

		initLevelPoints();
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
		if (_backButton.isClicked())
		{
			SL.enterState(new WorldMapState());
			return;
		}
		else if (_playButton.isClicked())
		{
			if (SL.Session.isLevelUnlocked(SL.Session.World, SL.Session.Level))
			{
				SL.enterState(new GameState());
				return;
			}			
			else
			{
				SL.showNotification("Level not unlocked yet.", Toast.LENGTH_SHORT);
			}
		}
		else if (SL.Input.isMouseClicked())
		{
			for (int i = 0; i < _levelPoints.length; i++)
			{
				if (Utils.distance(_levelPoints[i].x, _levelPoints[i].y, SL.Input.getMouseX(), SL.Input.getMouseY()) <= (_levelPointRadius * 2.0f))
				{
					selectLevel(i + 1);
				}
			}
		}
		
		if (SL.Input.isBackClicked())
		{
			SL.enterState(new MainMenuState(false));
			return;
		}
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
		
		//Background and title
		canvas.drawBitmap(SL.Graphics.WorldMapBackground, SL.GameAreaX, 0, null);
		
		Bitmap title = SL.Graphics.WorldTitles[SL.Session.World-1];
		canvas.drawBitmap(title, SL.ScreenCenterX - ((float)title.getWidth() * 0.5f), (float)SL.GameAreaHeight * 0.14f, null);
		
		//Draw level points
		Point previousPoint = null;
		
		for (int i = 0; i < SL.LevelsPerWorld; i++)
		{
			if (previousPoint != null)
				canvas.drawLine(previousPoint.x, previousPoint.y, _levelPoints[i].x, _levelPoints[i].y, _connectorPaint);
			previousPoint = _levelPoints[i];
		}
		
		for (int i = 0; i < SL.LevelsPerWorld; i++)
		{
			canvas.drawCircle(_levelPoints[i].x, _levelPoints[i].y, _levelPointRadius, _connectorPaint);
			if (SL.Session.isLevelUnlocked(SL.Session.World, i+1))
				canvas.drawCircle(_levelPoints[i].x, _levelPoints[i].y, _levelPointRadius * 0.8f, SL.Graphics.YellowPaint);
		}
		
		for (int i = 0; i < SL.LevelsPerWorld; i++)
		{	
			if (SL.Session.isLevelUnlocked(SL.Session.World, i+1))
				_levelNumberPaint.setARGB(255,0, 0, 0);
			else
				_levelNumberPaint.setARGB(255, 255, 255, 255);
			
			canvas.drawText((i + 1) + "", _levelPoints[i].x, _levelPoints[i].y + _levelPointRadius * 0.5f, _levelNumberPaint);
		}
		
		//Draw level selection
		canvas.drawBitmap(SL.Graphics.BottomShooter, _levelPoints[SL.Session.Level - 1].x - ((float)SL.Graphics.BottomShooter.getWidth() * 0.5f), 
				_levelPoints[SL.Session.Level - 1].y - ((float)SL.Graphics.BottomShooter.getHeight() * 0.5f), null);
		//canvas.drawText(_selectedLevelString, SL.GameAreaX + (float)SL.GameAreaWidth * 0.2f, SL.GameAreaHeight * 0.69f, _selectedLevelPaint);
		
		_backButton.draw(canvas);
		_playButton.draw(canvas);
	}

	@Override
	public void buildMenu(Menu menu) 
	{
		MenuOption.Achievements.addToMenu(menu);
		MenuOption.Stats.addToMenu(menu);
		MenuOption.ToggleSound.addToMenu(menu);
		MenuOption.Help.addToMenu(menu);
	}
	
	private void selectLevel(int level)
	{
		SL.Session.Level = level;
		_selectedLevelString = "Level " + SL.Session.World + "-" + SL.Session.Level;
	}
	
	private void initLevelPoints()
	{
		_levelPoints = new Point[SL.LevelsPerWorld];
		
		float angleDt = (float)Math.PI / 2.0f;
		float angleAt = 0.08f;
		float angle = 0.0f;
		float x, y;
		for (int i = 0; i < SL.LevelsPerWorld; i++)
		{
			angleDt = Math.max(0.35f, angleDt - angleAt);
			
			if (i == 1)
				angle += Math.PI * 1.5;
			else if (i < 3)
				angle += Math.PI / 2.5f;
			else if (i < 7)
				angle += Math.PI / 4.0f;
			else 
				angle += angleDt;
			
			x = (float)SL.ScreenCenterX + (angle * (float)SL.GameAreaWidth * 0.0208333f) * (float)Math.cos(angle);
			y = (float)SL.GameAreaHeight * 0.5f + (angle * (float)SL.GameAreaHeight * 0.015f) * (float)Math.sin(angle);
			
			if (i == 0)
			{
				x -= (float)SL.GameAreaWidth * 0.03f;
				y -= (float)SL.GameAreaHeight * 0.05f;
			}
				
			_levelPoints[SL.LevelsPerWorld - 1 - i] = new Point((int)x, (int)y);
		}
	}
	
	@Override
	public boolean isFinished() 
	{
		return true;
	}
}
