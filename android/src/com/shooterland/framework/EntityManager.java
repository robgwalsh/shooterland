package com.shooterland.framework;

import java.util.ArrayList;

import com.shooterland.entities.FadingTile;
import com.shooterland.entities.FlyingTile;

import android.graphics.Canvas;

public class EntityManager 
{
	private ArrayList<AbstractEntity> _entities = new ArrayList<AbstractEntity>();
	private ArrayList<EntityManagerListener> _listeners = new ArrayList<EntityManagerListener>();
	
	public void add(AbstractEntity entity)
	{
		_entities.add(entity);
	}
	
	public void addListener(EntityManagerListener listener)
	{
		_listeners.add(listener);
	}
	
	public void update(float dt)
	{
		ArrayList<AbstractEntity> entitiesToRemove = new ArrayList<AbstractEntity>();
		
		for (AbstractEntity e : _entities)
		{
			e.update(dt);
			if (e.isDead())
				entitiesToRemove.add(e);
		}
		
		for (AbstractEntity e : entitiesToRemove)
		{
			_entities.remove(e);
			for (EntityManagerListener listener : _listeners)
				listener.onEntityRemoved(e);
		}
	}
	
	public void draw(Canvas canvas)
	{
		for (AbstractEntity e : _entities)
		{
			e.draw(canvas);
		}
	}
	
	//Java sucks ass so I can't do a generic form of these methods
	public int numFadingTiles()
	{
		int count = 0;
		for (Object o : _entities)
		{
			if (o instanceof FadingTile)
				count++;
		}
		return count;
	}
	
	public int numFlyingTiles()
	{
		int count = 0;
		for (Object o : _entities)
		{
			if (o instanceof FlyingTile)
				count++;
		}
		return count;
	}
		
	public void clear()
	{
		_entities.clear();
	}
	
	public interface EntityManagerListener
	{
		void onEntityRemoved(AbstractEntity entity);
	}
}
