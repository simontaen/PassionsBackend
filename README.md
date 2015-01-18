PassionsBackend
===============


The Parse Backend for the [Passions iOS App](https://itunes.apple.com/app/id927620055?mt=8&amp;at=10lMuD)

# Background Jobs on Parse

## findNewAlbums

* Query for all Artists where totalAlbums DOES exist
* find new albums for the queried artists
	* fetch total albums of artist
	* if changed fetch all albums for artist (complete info), if no change return
		* see below...
		* return the artist and albums
	* find the newest album
		* use a default UTC for date 1000.1.1
		* for each album, normalize date to UTC and compare against the currently newest
		* return newest album
	* query all users where "favArtists" contains the current user
	* send a push to all installations of these users "installation"
	* save the artist and return
* set the status and return

## fetchFullAlbums

* Query for all Artists where totalAlbums DOES NOT exist
* call spotify to fetch all albums for artist (complete info)
	* fetch artists (simplified) albums, all
	* update totalAlbums if changed
	* process the simplified albums
		* fetch complete album info
		* create or update the album
			* query for the album using the spotify id
			* if empty create it
			* update and save the album
		* return the artist and albums
* save the artist
* set the status and return

