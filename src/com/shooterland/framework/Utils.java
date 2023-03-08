package com.shooterland.framework;

import java.util.Date;
import java.util.Random;


import android.app.AlertDialog;
import android.app.AlertDialog.Builder;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Rect;

public class Utils 
{
	private static Random _random = new Random();
	
	public static long currentMillis()
	{
		Date date = new Date();
		return date.getTime();
	}
	
	public static float timeSince(float time)
	{
		return SL.GameTime - time;
	}
	
	public static float realTimeSince(float time)
	{
		return SL.RealTime - time;
	}
	
	public static int randomInt(int min, int max)
	{
		return _random.nextInt(max - min) + min;
	}
	
	public static int getPercentOfScreenHeight(float percent)
	{
		return (int)((float)SL.ScreenHeight * percent);
	}
	
	public static int percentOfGameAreaWidth(float percent)
	{
		return (int)((float)SL.GameAreaWidth * percent);
	}
	
	public static int percentOfGameAreaHeight(float percent)
	{
		return (int)((float)SL.GameAreaHeight * percent);
	}
	
	public static Rect BuildCollisionRect(float percentStartX, float percentStartY, float percentSize)
	{
		return BuildCollisionRect(percentStartX, percentStartY, percentSize, percentSize);
	}
	
	public static Rect BuildCollisionRect(float percentStartX, float percentStartY, float percentWidth, float percentHeight)
	{
		Rect rect = new Rect();

		rect.left = (int)((float)SL.GameAreaX + (float)SL.GameAreaWidth * percentStartX);
		rect.top = (int)((float)SL.GameAreaHeight * percentStartY);
		rect.right = rect.left + (int)((float)SL.GameAreaWidth * percentWidth);
		rect.bottom = rect.top + (int)((float)SL.GameAreaHeight * percentHeight);
		
		return rect;
	}
	
	public static int getPercentOfScreenWidth(float percent)
	{
		return (int)((float)SL.ScreenWidth * percent);
	}
	
	public static int distance(float x1, float y1, float x2, float y2)
	{
		if (x1 == x2) return (int) Math.abs(y1 - y2);
		if (y1 == y2) return (int) Math.abs(x1 - x2);
		return (int) Math.sqrt(((x2 - x1)*(x2 - x1) + (y2 - y1)*(y2 - y1)));
	}
	
	public static String formatException(Exception e)
	{
		StringBuffer sb = new StringBuffer(e.getClass().toString() + "\n");
		
		for (StackTraceElement ste : e.getStackTrace())
		{
			sb.append(ste.toString() + "\n");
		}
		
		return sb.toString();
	}
	
	public static int getCurrentLevelResourceId()
	{
		String fileName = "world" + SL.Session.World + "level" + SL.Session.Level;
		return SL.Resources.getIdentifier(fileName, "raw", "com.shooterland");
	}
	
	public static int distance(int x1, int y1, int x2, int y2) 
	{
		if (x1 == x2) return Math.abs(y1 - y2);
		if (y1 == y2) return Math.abs(x1 - x2);
		return (int) Math.sqrt(((x2 - x1)*(x2 - x1) + (y2 - y1)*(y2 - y1)));
	}
	
	public static void drawSquare(Canvas canvas, float x, float y, int radius, Paint paint)
	{
		canvas.drawLine(x, y, x + radius, y, paint);
		canvas.drawLine(x + radius, y, x + radius, y + radius, paint);
		canvas.drawLine(x + radius, y + radius, x, y + radius, paint);
		canvas.drawLine(x, y + radius, x, y, paint);
	}
	
	public static void fillExtraSideSpace(Canvas canvas)
	{
		if (SL.GameAreaX == 0)
			return;
		
		canvas.drawRect(new Rect(0, 0, SL.GameAreaX, SL.ScreenHeight), SL.Graphics.BlackPaint);
		canvas.drawRect(new Rect(SL.GameAreaX + SL.GameAreaWidth, 0, SL.ScreenWidth, SL.ScreenHeight), SL.Graphics.BlackPaint);
		
		int size = 15;

		for (int x = SL.GameAreaX; x > 0; x -= size)
			canvas.drawLine(x, 0, x, SL.ScreenHeight, SL.Graphics.DarkGreenPaint);
		for (int x = SL.GameAreaX + SL.GameAreaWidth; x < SL.ScreenWidth; x += size)
			canvas.drawLine(x, 0, x, SL.ScreenHeight, SL.Graphics.DarkGreenPaint);
		
		for (int y = 0; y < SL.ScreenHeight; y += size)
		{	
			canvas.drawLine(0, y, SL.GameAreaX, y, SL.Graphics.DarkGreenPaint);
			canvas.drawLine(SL.GameAreaX + SL.GameAreaWidth, y, SL.ScreenWidth, y, SL.Graphics.DarkGreenPaint);
		}
	}
	
	public static void drawLoadScreen(Canvas canvas)
	{
		canvas.drawPaint(SL.Graphics.BlackPaint);
		int size = 15;
		for (int x = 0; x <= SL.ScreenWidth; x += size)
			canvas.drawLine(x, 0, x, SL.ScreenHeight, SL.Graphics.DarkGreenPaint);
		for (int y = 0; y <= SL.ScreenHeight; y += size)
			canvas.drawLine(0, y, SL.ScreenWidth, y, SL.Graphics.DarkGreenPaint);
		
		canvas.drawText("Loading...", SL.ScreenCenterX, SL.ScreenCenterY, SL.Graphics.LoadingPaint);
	}
	
	public static void showExceptionWindow(Exception e)
	{
		/**
		Builder builder = new AlertDialog.Builder(SL.Activity);
        builder.setTitle("Fatal Error");
        builder.setMessage(formatException(e));
        builder.setPositiveButton("Close", null);
        builder.show();*/
		
		Builder builder = new AlertDialog.Builder(SL.Activity);
        builder.setTitle("beer or wine");
        builder.setMessage("which one do you prefer?");
        builder.setPositiveButton("ok", null);
        builder.setNegativeButton("cancel", null);
        builder.show(); 
	}

}
