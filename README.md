# Deezer-Artist-Dumper / Downloader

A tampermonkey userscript which adds the functionality to download all of the Artists EPs, Singles, Albums and Features.
Aims to mimic the Deezer Design on desktop. Supports both dark and white mode, although intended for dark mode.
I do not know if "all" are really all songs, with all I mean every song which is listed on the discography page of an artist. I believe the Top 100 Tracks cannot include more songs. If that is wrong, contact me and I will add that.
[Github](https://github.com/bababoi-2/Deezer-Artist-Dumper/)
[GreazyFork](https://greasyfork.org/en/scripts/497123)

## Features
- Adds a button on the artist page
- Lets you choose if you want to include EPs, Singles, Albums, Features (Although Deezer shows the whole Album as a Feature, only songs with the artist are added)
- Lets you choose if you want to add songs to a new playlist with the artist profile name/picture or an already existent playlist
- Lets you download a dump log which can be used in later dumps (also in combination with other dumps) to ignore songs which have already been added once (useful if you want to catch up on an artist)
- Lets you use Regex to blacklist Songs with certain titles
![image](https://github.com/bababoi-2/Deezer-Artist-Dumper/assets/165707934/5772bbe8-855c-45d4-b6da-5f51060ed1c1)

# TODO
- artist/contributer name/album name blacklist
- add a whitelist with the same features as the blacklist. if the whitelist is active, only songs on the whitelist should be added IF they are not blacklisted.
- combine blacklists and whitelist into same text area and use some form of fomat to specify which rule is for what type of list and what type of filter
- setting to add the songs one by one which results in them being able to be sorted by release date or rank properly (would be way slower when enabled as there would be a synchronous (since we want to keep order) request for every song)
- filter songs by length
- create dump from playlist
  - automatically determine dominant artist/let user choose 
  - automatically create regex which would blacklist songs from the artist which are not in the current playlist
