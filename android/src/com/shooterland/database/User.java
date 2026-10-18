package com.shooterland.database;

public class User 
{
	public int id;
	public int maxLevel;
	public int gamesWon;
	public int gamesLost;
	public int moneyEarned;
	public int moneyStolen;
	public int numCombos;
	
	public User()
	{
		reset();
	}
	
	public void reset()
	{
		gamesWon = 0;
		gamesLost = 0;
		moneyEarned = 0;
		moneyStolen = 0;
		numCombos = 0;
		maxLevel = 0;
	}
}
