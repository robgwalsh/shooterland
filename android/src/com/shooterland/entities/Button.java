package com.shooterland.entities;

import com.shooterland.framework.SL;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Rect;
import android.graphics.Paint.Align;

public class Button 
{
	protected float _x, _y;
	private Bitmap _bitmap;
	private String _text;
	private Paint _textPaint;
	
	/**
	 * Constructs a new button
	 * 
	 * @param bitmap
	 * @param text
	 * @param x The x coordinate of the middle of the button
	 * @param y The y coordinate of the middle of the button
	 */
	public Button(Bitmap bitmap, String text, float x, float y)
	{
		_bitmap = bitmap;
		_x = x - (float)bitmap.getWidth() * 0.5f;
		_y = y - (float)bitmap.getHeight() * 0.5f;
		_text = text;
		_textPaint = new Paint();
		_textPaint.setARGB(255, 255, 255, 255);
		_textPaint.setAntiAlias(true);
		_textPaint.setTextAlign(Align.CENTER);
		_textPaint.setTextSize((float)bitmap.getHeight() * 0.5f);
	}
	
	public void draw(Canvas canvas)
	{
		canvas.drawBitmap(_bitmap, _x, _y, null);
		canvas.drawText(_text, _x + (float)_bitmap.getWidth() * 0.5f, _y + (float)_bitmap.getHeight() * 0.65f, _textPaint);
	}
	
	public boolean isClicked()
	{
		return SL.Input.isClicked(new Rect((int)_x, (int)_y, (int)_x + _bitmap.getWidth(), (int)_y + _bitmap.getHeight()));
	}

	public String getText() 
	{
		return _text;
	}
}
