package com.shooterland.database;

public class Queries 
{
	////////// USER //////////////
	public static final String USER_CREATE_TABLE = 
		"create table user (" +
		"  id integer primary key autoincrement, " +
		"  max_level integer, " +
		"  games_won integer, " +
		"  games_lost integer, " +
		"  num_comboes integer, " +
		"  money_earned integer, " +
		"  money_stolen integer);";
	public static final String USER_GET =
		"select * from user";
	public static final String USER_DROP_TABLE =
		"drop table if exists user;";


	///////// LEVEL //////////
	public static final String LEVEL_CREATE_TABLE =
		"create table level (" +
		"  id integer primary key autoincrement, ";

}
