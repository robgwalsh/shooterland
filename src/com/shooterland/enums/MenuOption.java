package com.shooterland.enums;

import android.view.Menu;

public enum MenuOption
{

	Pause (1, "Pause"),
	Achievements (2, "Achievements"),
	Help (3, "Help"),
	ToggleSound (4, "Toggle Sound"),
	Stats (4, "Stats"),
	Resume (5, "Resume");
	
	private int _id;
	private String _text;
	
	MenuOption(int id, String text)
	{
		_id = id;
		_text = text;
	}
	
	public void addToMenu(Menu menu)
	{
		menu.add(0, _id, 0, _text);
	}
	
}
