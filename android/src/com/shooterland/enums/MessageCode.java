package com.shooterland.enums;

public enum MessageCode 
{
	Notification (234223252),
	Prompt (234234324),
	Store (45336354);
	
	private int _id;
	
	MessageCode(int id)
	{
		_id = id;
	}
	
	public int getId()
	{
		return _id;
	}
}
