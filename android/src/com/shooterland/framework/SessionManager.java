package com.shooterland.framework;

import com.shooterland.database.DBAdapter;
import com.shooterland.database.User;

public class SessionManager 
{
	private DBAdapter _dbHelper;
	
	public SessionManager()
	{
		_dbHelper = new DBAdapter(SL.Context);
		load();
	}
	
	public int Level = 1;
	public int World = 1;
	public User User;
	
	public void resetSaveFile()
	{
		User.reset();
		save();
	}
	
	public void load()
	{
		User = _dbHelper.getUser();
	}
	
	public void save()
	{
		_dbHelper.saveUser(User);
	}
	
	public boolean isLevelUnlocked(int world, int level)
	{
		return (world-1) * SL.LevelsPerWorld + (level - 1) <= User.maxLevel;
	}
	
	public void unlockLevel(int world, int level)
	{
		if (!isLevelUnlocked(world, level))
		{
			User.maxLevel = (world-1) * SL.LevelsPerWorld + (level - 1);
		}
	}
}
