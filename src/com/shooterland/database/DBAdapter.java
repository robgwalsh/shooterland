package com.shooterland.database;


import com.shooterland.framework.SL;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

public class DBAdapter extends SQLiteOpenHelper  
{
	public DBAdapter(Context context) 
	{
		super(context, "ShooterlandDatabase", null, 2);
	}	
	
	public User getUser()
	{
		User user = new User();
		SQLiteDatabase db = null;
		Cursor cursor = null;
		
		try
		{
			db = getReadableDatabase();
			cursor = db.rawQuery(Queries.USER_GET, null);
		
			if (cursor.moveToFirst())
			{
				user.id = cursor.getInt(cursor.getColumnIndex("id"));
				user.gamesWon = cursor.getInt(cursor.getColumnIndex("games_won"));
				user.gamesLost = cursor.getInt(cursor.getColumnIndex("games_lost"));
				user.maxLevel = cursor.getInt(cursor.getColumnIndex("max_level"));
				user.moneyEarned = cursor.getInt(cursor.getColumnIndex("money_earned"));
				user.moneyStolen = cursor.getInt(cursor.getColumnIndex("money_stolen"));
			}
		}
		catch (Exception e)
		{
			SL.handleException(e);
		}
		finally
		{
			if (db != null)
				db.close();
			if (cursor != null)
				cursor.close();
		}
		
		return user;
	}
	
	public void saveUser(User user)
	{
		SQLiteDatabase db = null;
		try
		{
			ContentValues values = new ContentValues();
			values.put("id", 0);
			values.put("max_level", user.maxLevel);
			values.put("games_won", user.gamesWon);
			values.put("games_lost", user.gamesLost);
			values.put("money_earned", user.moneyEarned);
			values.put("money_stolen", user.moneyStolen);
		
			db = getWritableDatabase();
			db.update("user", values, null, null);
		}
		catch (Exception e)
		{
			SL.handleException(e);
		}
		finally
		{
			if (db != null)
				db.close();
		}
	}
	
	@Override
	public void onCreate(SQLiteDatabase db) 
	{
		db.execSQL(Queries.USER_CREATE_TABLE);
	}

	@Override
	public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) 
	{
		db.execSQL(Queries.USER_DROP_TABLE);
		db.execSQL(Queries.USER_CREATE_TABLE);
		
		//Populate with a blank user.
		saveUser(new User());
	}

	
}
