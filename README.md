# Deezer-Artist-Dumper / Downloader

A script which adds the functionality to download all of the Artists EPs, Singles, Albums and Features using no dependenices. Designed for Chrome w/ Violentmonkey, should work with other browsers and userscript managers. Now also supports the [desktop](https://github.com/bertigert/Deezer-Artist-Dumper/blob/desktop/deezer_artist_dumper.js) application.

Aims to mimic the Deezer Design on desktop. Supports both dark and white mode, although intended for dark mode.
I do not know if "all" are really all songs, with all I mean every song which is listed on the discography page of an artist. I believe the Top 100 Tracks cannot include more songs. If that is wrong, contact me and I will add that.

## Now also supported for the desktop application
Thanks to the [DeezMod](https://github.com/bertigert/DeezMod) project we can now easily use scripts within the desktop application. You can download the version for that script [here](https://github.com/bertigert/Deezer-Artist-Dumper/blob/desktop/deezer_artist_dumper.js)

---
![image (2)](https://github.com/user-attachments/assets/08383448-5365-4f9e-b682-8bde2ce288af)

## Features
- Adds a button on the artist page
- Lets you choose if you want to include EPs, Singles, Albums, Features (Although Deezer shows the whole Album as a Feature, only songs with the artist are added)
- Lets you choose if you want to not add duplicate songs (using ISRC)
- Lets you choose if you want to add songs to a new playlist with the artist profile name/picture or an already existent playlist
- Lets you download a dump log which can be used in later dumps (also in combination with other dumps) to ignore songs which have already been added once (useful if you want to catch up on an artist)
- Lets you use Regex to blacklist/whitelist (blacklist > whitelist) certain
    - song name
    - album name (note that every song is an album, so an album blacklist also blocks songs **if** the artist did not specify a different album name. If you know what you're doing, you can use this feature to improve the speed by alot, as we don't need to get the songs for the album (mostly useful for singles))
    - contributor name (meaning if a blacklisted artist has contributed, the song is blacklisted)
- A dump merge script is included which can be used to merge multiple dumps into a single dump, simplifying the dump loading process for later uses (a update dumps script is also included which should update old version dumps to a the new version)

## Links
- [Github](https://github.com/bertigert/Deezer-Artist-Dumper/)
- [GreazyFork](https://greasyfork.org/en/scripts/497123)


## TODO
- setting to add the songs one by one which results in them being able to be sorted by release date or rank properly (would be way slower when enabled as there would be a synchronous (since we want to keep order) request for every song. You could probably reduce the amount of requests by grouping songs with in-order song ids together and only if there is a song with a out-of-order song id send another request)
- create dump from playlist
  - automatically determine dominant artist/let user choose 
  - automatically create regex which would blacklist songs from the artist which are not in the current playlist
