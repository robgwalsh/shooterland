package com.shooterland.framework;

import com.shooterland.R;

import android.media.MediaPlayer;

public class SoundManager 
{
	private MediaPlayer _mediaPlayer;
	private int _currentMusic = -1;
	
	public SoundManager()
	{
	}
	
	public void update(float dt)
	{
	}
	
	public void stopMusic()
	{
		if (_mediaPlayer != null)
			_mediaPlayer.stop();
	}
	
	public boolean isMusicPlaying()
	{
		return _mediaPlayer != null &&  _mediaPlayer.isPlaying();
	}
	
	public void pauseMusic()
	{
		if (_mediaPlayer != null)
			_mediaPlayer.pause();
	}
	
	public void resumeMusic()
	{
		if (_mediaPlayer != null)
			_mediaPlayer.start();
	}
	
	public void playMenuMusic()
	{
		playMusic(R.raw.titlescreen);
	}
	
	public void playWorldMusic(int world)
	{
		if (world == 1)
			playMusic(R.raw.world1);
		else
			return;
	}
	
	private void playMusic(int id)
	{
		if (id == _currentMusic)
			return;
		
		_currentMusic = id;
		
		if (isMusicPlaying())
			stopMusic();
		
		_mediaPlayer = MediaPlayer.create(SL.Context, id);
		_mediaPlayer.setLooping(true);
		_mediaPlayer.start();
	}
}
