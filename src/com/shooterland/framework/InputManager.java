package com.shooterland.framework;

import android.graphics.Rect;
import android.view.MotionEvent;


public class InputManager 
{
	private boolean _mouseDown;
	private boolean _backPressed;
	private int _mouseX, _mouseY;
	private boolean _clicked;
	
	public void update(float dt)
	{
		_clicked = false;
		_backPressed = false;
	}
	
	/**
	 * @return Whether or not the left mouse button is currently down.
	 */
	public boolean isMouseDown()
	{
		return _mouseDown;
	}
	
	/**
	 * @return Whether or not the left mouse button was clicked this frame.
	 */
	public boolean isMouseClicked()
	{
		return _clicked;
	}
	
	/**
	 * @return Whether or not the back button was clicked this frame.
	 */
	public boolean isBackClicked()
	{
		return _backPressed;
	}
	
	public void handleBackButton()
	{
		_backPressed = true;
	}
	
	public void handleInputEvent(MotionEvent e)
	{
		if (e.getAction() == MotionEvent.ACTION_DOWN)
    	{
			_mouseDown = true;
			_clicked = true;
			_mouseX = (int)e.getX();
			_mouseY = (int)e.getY();
    	}
		else if (e.getAction() == MotionEvent.ACTION_UP)
		{
			_mouseDown = false;
			_mouseX = (int)e.getX();
			_mouseY = (int)e.getY();
		}
		else if (e.getAction() == MotionEvent.ACTION_MOVE)
		{
			_mouseX = (int)e.getX();
			_mouseY = (int)e.getY();
		}
	}
	
	public boolean isClicked(Rect rect)
	{
		return isMouseClicked() && rect.contains(_mouseX, _mouseY);
	}
		
	public int getMouseX()
	{
		return _mouseX;
	}
	
	public int getMouseY()
	{
		return _mouseY;
	}
}
