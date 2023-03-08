package com.shooterland.framework;

import com.shooterland.ShooterlandActivity;
import com.shooterland.enums.DialogResult;
import com.shooterland.enums.MessageCode;
import com.shooterland.enums.Tile;
import com.shooterland.framework.*;
import com.shooterland.states.*;

import android.content.Context;
import android.content.res.Resources;
import android.graphics.Canvas;
import android.os.Message;
import android.util.Log;
import android.view.Display;
import android.view.Menu;
import android.widget.Toast;

/**
 * Main game singleton. Except its just a static class and not a singleton so that
 * we don't have to type .Instance everywhere.
 */
public class SL 
{	
	public static ShooterlandActivity Activity;
	public static Context Context;
	public static Menu Menu;
	public static Resources Resources;
	public static GraphicsManager Graphics;
	public static AbstractState CurrentState;
	public static InputManager Input;
	public static SessionManager Session;
	public static SoundManager Sound;
		
	public static float GameTime;
	public static float RealTime;
	public static boolean Initialized = false;
	public static boolean ResourcesLoadedYet = false;
	public static boolean LoadingDone = false;
	public static boolean DialogShowing = false;

	//Constants
	public static int ScreenWidth;
	public static int ScreenHeight;
	public static int ScreenCenterX;
	public static int ScreenCenterY;
	public static int GridWidth;
	public static int GridHeight;
	public static int GridSquareSize;
	public static int GameAreaWidth;
	public static int GameAreaHeight;
	public static int GameAreaX;
	public static final int LevelsPerWorld = 30;
	public static final int NumWorlds = 5;
		
	private static AbstractState _nextState;
	
	public static void init(ShooterlandActivity activity)
	{	
		Display display = activity.getWindowManager().getDefaultDisplay();
        setScreenSize(display.getWidth(), display.getHeight());		
		
		Activity = activity;
		Context = activity.getApplicationContext();
		Resources = Context.getResources();		
		Graphics = new GraphicsManager();
		Input = new InputManager();
		Session = new SessionManager();
		Sound = new SoundManager();
		RealTime = GameTime = 0.0f;
		loadResources();
		Initialized = true;
		
		enterState(new MainMenuState(true));
	}
	
	public static void loadResources()
	{
		Session.load();
		Graphics.initResources();
	}
	
	public static void update(float dt)
	{	
		if (DialogShowing)
			return;
		
		//If there is a state change queued up, do it now
		if (_nextState != null)
		{
			if (CurrentState != null)
				CurrentState.leaveState();
			
			CurrentState = _nextState;
			CurrentState.enterState();
			_nextState = null;
		}
		
		RealTime += dt;
		
		if (!DialogShowing)
			GameTime += dt;
		
		CurrentState.update(dt);
		Input.update(dt);
		Sound.update(dt);
	}
	
	public static void draw(Canvas canvas, float dt)
	{			
		CurrentState.draw(canvas, dt);
	}
	
	public static void pauseExecution()
	{
		Sound.pauseMusic();
		
		if (CurrentState != null && CurrentState instanceof GameState)
		{
			((GameState)CurrentState).notifyAppPaused();
		}
	}
	
	public static void resumeExecution()
	{
		Sound.resumeMusic();
	}
	
	public static void enterState(AbstractState newState)
	{
		_nextState = newState;
	}
	
	/**
	 * @param text	 The text to show
	 * @param length User Toast for length constants
	 */
	public static void showNotification(String text, int length)
	{
		Message message = new Message();
		message.arg1 = MessageCode.Notification.getId();
		message.arg2 = length;
		message.obj = text;
		Activity.Handler.sendMessage(message);
	}
		
	public static void handleException(Exception e)
	{
		String exceptionString = Utils.formatException(e);
		Log.e("Shooterland", exceptionString);
		showNotification(exceptionString, Toast.LENGTH_LONG);
	}
	
	public static boolean showPrompt(String text)
	{
		DialogShowing = true;
		try
		{
			Activity.BigHackToDoDialogs = DialogResult.Waiting;
			Message message = new Message();
			message.arg1 = MessageCode.Prompt.getId();
			message.obj = text;
			
			Activity.Handler.sendMessage(message);
			while (Activity.BigHackToDoDialogs == DialogResult.Waiting)
			{
				try
				{
					Thread.sleep(100);
				} catch (InterruptedException e) { }
			}
			
			return Activity.BigHackToDoDialogs == DialogResult.Yes;
		} 
		finally
		{
			DialogShowing = false;
		}
	}
	
	/**
	 * Shows the store and returns what item was bought, or null if they
	 * cancelled out of the store.
	 */
	public static Tile showStore()
	{
		Activity.BigHackToDoDialogs = DialogResult.Waiting;
		Message message = new Message();
		message.arg1 = MessageCode.Store.getId();
		
		Activity.Handler.sendMessage(message);
		while (Activity.BigHackToDoDialogs == DialogResult.Waiting)
		{
			try
			{
				Thread.sleep(100);
			} catch (InterruptedException e) { }
		}
		
		return Activity.BigHackToDoDialogs == DialogResult.Yes ? Activity.BigHackToDoStore : null;
	}
	
	private static void setScreenSize(int width, int height)
	{
		ScreenWidth = width;
		ScreenHeight = height;
		ScreenCenterX = ScreenWidth / 2;
		ScreenCenterY = ScreenHeight / 2;
		GridWidth = 11;
		GridHeight = 11;
		GridSquareSize = (int)(((float)ScreenHeight * 0.98f) / ((float)GridHeight + 1.0f));
		
		GameAreaHeight = ScreenHeight;
		GameAreaWidth = (int)((float)ScreenHeight * 1.5f);
		GameAreaX = (int)((float)(ScreenWidth - GameAreaWidth) / 2.0f);
	}
}
