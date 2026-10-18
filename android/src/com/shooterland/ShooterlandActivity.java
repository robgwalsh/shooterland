package com.shooterland;

import com.shooterland.dialogs.StoreDialog;
import com.shooterland.enums.DialogResult;
import com.shooterland.enums.MessageCode;
import com.shooterland.enums.Tile;
import com.shooterland.framework.SL;
import com.shooterland.framework.Utils;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.Dialog;
import android.content.DialogInterface;
import android.graphics.Canvas;
import android.os.Bundle;
import android.os.Handler;
import android.os.Message;
import android.view.KeyEvent;
import android.view.Menu;
import android.view.MenuItem;
import android.view.MotionEvent;
import android.view.SurfaceHolder;
import android.view.SurfaceView;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Toast;

public class ShooterlandActivity extends Activity
{	
	private ShooterlandView _view;
	public DialogResult BigHackToDoDialogs;
	public Tile BigHackToDoStore;
	
	@Override
	public void onCreate(Bundle savedInstanceState) 
	{
		super.onCreate(savedInstanceState);
		
		Window window = getWindow();
		window.setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
		window.setFlags(WindowManager.LayoutParams.FLAG_ALT_FOCUSABLE_IM, WindowManager.LayoutParams.FLAG_ALT_FOCUSABLE_IM);
		
		setRequestedOrientation(0);
		
		if (!SL.Initialized)
			SL.init(this);
		
	    requestWindowFeature(Window.FEATURE_NO_TITLE);
	    _view = new ShooterlandView(this);
	    setContentView(_view);
	}
	
	@Override
	public boolean onPrepareOptionsMenu(Menu menu)
	{
		super.onPrepareOptionsMenu(menu);
		
		menu.clear();
		
		if (SL.CurrentState != null)
			SL.CurrentState.buildMenu(menu);
		return true;
	}
	
	@Override
	public boolean onOptionsItemSelected(MenuItem item) 
	{

        return false;
    }

	@Override
	public boolean onKeyDown(int keyCode, KeyEvent event) 
	{
		if (keyCode == KeyEvent.KEYCODE_BACK)
		{
			if (!SL.DialogShowing)
				SL.Input.handleBackButton();
			return true;
		}	
		
		return false;
	}
	
	@Override
	protected void onPause()
	{
		SL.pauseExecution();
		super.onPause();
	}
	
	@Override
	protected void onResume()
	{	
		SL.resumeExecution();
		super.onResume();
	}
	
	@Override
	protected Dialog onCreateDialog(int id) 
	{ 
		StoreDialog dialog = new StoreDialog(this);
		return dialog;
	}
	
	public Handler Handler = new Handler() 
	{
		@Override
		public void handleMessage(Message msg) 
		{	
			try
			{
				if (msg.arg1 == MessageCode.Notification.getId())
				{
					Toast.makeText(SL.Context, (String)msg.obj, Toast.LENGTH_SHORT).show();
				}
				else if (msg.arg1 == MessageCode.Prompt.getId())
				{
					AlertDialog.Builder builder = new AlertDialog.Builder(SL.Activity);
					builder.setMessage((String)msg.obj);
					builder.setCancelable(false);
					builder.setPositiveButton("Yes", 
							new DialogInterface.OnClickListener() {
					           public void onClick(DialogInterface dialog, int id) {
					                SL.Activity.BigHackToDoDialogs = DialogResult.Yes;
					           }
					       });
					
					builder.setNegativeButton("No", 
							new DialogInterface.OnClickListener() {
								public void onClick(DialogInterface dialog, int id) {
									dialog.cancel();
									SL.Activity.BigHackToDoDialogs = DialogResult.No;
						        }
							});
					
					Dialog dialog = builder.create();
					dialog.show();
				}
				else if (msg.arg1 == MessageCode.Store.getId())
				{			
					SL.Activity.showDialog(0);
					/**
					 * StoreView view = new StoreView(SL.Context);
					AlertDialog.Builder builder = new AlertDialog.Builder(SL.Activity);
					builder.setView(view);
					
					Dialog dialog = builder.create();
					dialog.show();*/
				}
			}
			catch (Exception e)
			{
				SL.handleException(e);
			}
		}
	};
			
	public class ShooterlandView extends SurfaceView implements SurfaceHolder.Callback
	{
		private ShooterlandThread _thread;
		
		public ShooterlandView(ShooterlandActivity activity)
		{
			super(activity.getApplicationContext());
			
			SurfaceHolder holder = getHolder();
			holder.addCallback(this);
			_thread = new ShooterlandThread(holder);
			_thread.start();
			
			setFocusable(true);
		}
		
		public ShooterlandThread getThread()
		{
			return _thread;
		}
		
	    public boolean onTouchEvent(MotionEvent me) 
		{
	    	SL.Input.handleInputEvent(me);
	    	return true;
		}
		
		public void surfaceChanged(SurfaceHolder holder, int format, int width, int height) 
		{
		}

		public void surfaceCreated(SurfaceHolder holder) 
		{
			_thread.setRunning(true);
		}

		public void surfaceDestroyed(SurfaceHolder holder) 
		{
			_thread.setRunning(false);
		}
	}
		
	public class ShooterlandThread extends Thread
    {
    	private SurfaceHolder _surfaceHolder;
    	private boolean _running = false;
    	private long _lastFrameMillis;
    	
    	public ShooterlandThread(SurfaceHolder surfaceHolder)
    	{
    		_surfaceHolder = surfaceHolder;
    	}
    	
    	public void setRunning(boolean running)
    	{
    		synchronized(_surfaceHolder)
    		{
    			_running = running;
    		}
    	}
    	
    	public void pauseExecution()
    	{
    		synchronized(_surfaceHolder)
    		{
    			_running = false;
	    		if (SL.Initialized)
	    			SL.pauseExecution();
    		}
    	}
    	
    	public void resumeExecution()
    	{
    		synchronized(_surfaceHolder)
    		{
    			_running = true;
    			if (SL.Initialized)
    				SL.resumeExecution();
    		}
    	}
    	
    	@Override
    	public void run()
    	{    		            
    		long millis = 0;
    		
            while (true)
        	{
            	while (!_running)
				{
					yield();
				}
				
				if (!SL.ResourcesLoadedYet)
				{
					doLoadScreen();
					SL.ResourcesLoadedYet = true;
				}
				
				if (!SL.LoadingDone)
				{
					if (Utils.currentMillis() - millis < 1500)
	            		continue;
					SL.LoadingDone = true;
		    		_lastFrameMillis = Utils.currentMillis();
				}
            	
    			Canvas canvas = null;
    			try
    			{    		
    				canvas = _surfaceHolder.lockCanvas();
    				synchronized (_surfaceHolder)
    				{
    					long currentMillis = Utils.currentMillis();
    					float dt = (float)(currentMillis - _lastFrameMillis) / 1000.0f;
    					_lastFrameMillis = currentMillis;
    					
    					SL.update(dt);
    					
    					if (canvas != null)
    						SL.draw(canvas, dt);
    				}
    			}
    			catch (Exception e)
    			{
    				SL.handleException(e);
    			}
    			finally
    			{
    				if (canvas != null)
    				{
    					_surfaceHolder.unlockCanvasAndPost(canvas);
    				}
    			}
    		}    		
    	}
    	
    	private void doLoadScreen()
    	{
    		Canvas canvas = null;
    		
    		while (canvas == null)
    		{
				synchronized (_surfaceHolder)
				{
					canvas =  _surfaceHolder.lockCanvas();
					if (canvas != null)
					{
						Utils.drawLoadScreen(canvas);
					}
				}
    		}

			_surfaceHolder.unlockCanvasAndPost(canvas);
			SL.loadResources();
    	}
    }
}
