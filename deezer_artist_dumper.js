// ==UserScript==
// @name         Deezer Artist Dumper
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Adds the feature to add all artists songs to a playlist
// @author       Bababoiiiii
// @match        https://www.deezer.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=deezer.com
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

function set_css() {
    const css = document.createElement("style");
    css.type = "text/css";
    css.textContent = `
.main_btn {
    min-width: 32px;
    border-radius: 50%;
    transition-duration: 0.2s;
}
.main_btn svg path {
    fill: currentcolor;
}
.main_btn.active svg path{
    fill: var(--tempo-colors-text-accent-primary-default);
}
.main_btn:hover {
  background-color: var(--tempo-colors-background-neutral-tertiary-hovered);
}

.main_div {
    position: absolute;
    left: 110%;
    transform: translateY(-60%);
    width: 500px;
    overflow: auto;
    display: none;
    resize: horizontal;
    border-radius: 8px;
    background-color: var(--tempo-colors-background-neutral-secondary-default);
    cursor: pointer;
    z-index: 300;
}
.main_div * {
    font-size: 14px;
    color: currentcolor;
}

.my_textarea {
    position: relative;
    width: 100%;
    height: 75px;
    line-height: 1.5;
    background-color: var(--tempo-colors-background-neutral-secondary-default);
    border: 0.5px solid var(--tempo-colors-divider-neutral-primary-default);
    color: var(--tempo-colors-text-neutral-secondary-default);
    padding: 5px;
    resize: vertical;
    overflow-y: auto;
}
.my_textarea:hover {
    border-color: var(--tempo-colors-text-neutral-secondary-default);
}

.toggles {
    padding: 5px 5px;
    border-bottom: 1px solid var(--tempo-colors-divider-neutral-primary-default);
}
.toggles label {
    margin-left: 10px;
}
.toggles input {
    margin-left: 5px;
}

.my_dropdown {
    margin-left: 10px;
    font-size: 14px;
    background-color: var(--tempo-colors-background-neutral-secondary-default);
    border: 0.5px solid var(--tempo-colors-divider-neutral-primary-default);
    border-radius: 4px;
}
.my_dropdown:hover {
    border-color: var(--tempo-colors-text-neutral-secondary-default);
}

.searchbar {
    width: 100%;
    border: 0.5px solid var(--tempo-colors-divider-neutral-primary-default);
    border-radius: 6px;
    background-color: var(--tempo-colors-background-neutral-secondary-default);
    margin-top: 5px;
    padding: 8px 11px;
}
.searchbar:hover {
    border-color: var(--tempo-colors-text-neutral-secondary-default);
}

.new_playlist_btn {
    width: 100%;
    display: flex;
    align-items: center;
    padding: 8px 11px;
}
.new_playlist_btn svg {
    width: 24px;
    height: 24px;
    fill: var(--tempo-colors-text-accent-primary-default);
}
.new_playlist_btn svg path{
    fill: var(--tempo-colors-text-accent-primary-default);
}
.new_playlist_btn span {
    color: var(--tempo-colors-text-accent-primary-default);
}

.playlist_ul {
    width: 100%;
    height: 200px;
    overflow: auto;
    position: relative;
    top: 6px;
}
.playlist_ul button {
    width: 100%;
    padding: 12px 16px;
    text-align: left;
}
.playlist_ul button:hover {
    background-color: var(--tempo-colors-bg-contrast);
}
.playlist_ul button[selected=""] {
    background-color: #463554a1;
}

.action_btn {
    width: 100%;
    position: relative;
    background-color: var(--tempo-colors-background-accent-primary-default);
    font-weight: bold;
    font-size: 20px;
    border-radius: 5px;
    padding: 10px;
}
.action_btn:hover {
    background-color: var(--tempo-colors-background-accent-primary-hovered);
}
`
    document.querySelector("head").appendChild(css);
}


// data stuff

async function get_user_data() {
    const r = await fetch("https://www.deezer.com/ajax/gw-light.php?method=deezer.getUserData&input=3&api_version=1.0&api_token=", {
        "body": "{}",
        "method": "POST",
    });
    const resp = await r.json();

    return resp;
}

async function get_auth_token() {
    const r = await fetch("https://auth.deezer.com/login/renew?jo=p&rto=c&i=c", {
        "method": "POST",
        "credentials": "include"
    });
    const resp = await r.json();
    return resp.jwt;
}

function get_api_token() {
    return user_data.results.checkForm;
}

function get_user_id() {
    return user_data.results.USER.USER_ID;
}

function get_current_artist_id() {
    return location.pathname.split("/artist/")[1].split("/", 1)[0];
}

function get_current_artist_name() {
    return document.querySelector("meta[itemprop='name']").content
}

function get_playlists() {
    return JSON.parse(localStorage.getItem("PLAYLISTS_"+get_user_id())).data;
}

function get_config() {
    const config = GM_getValue("artist_dumper_config");
    return config ? JSON.parse(config): { // default settings
        toggles: {
            ep: true,
            singles: true,
            album: true,
            featured: false,
        },
        order: "RELEASE_DATE",
        regexes: "(\\(|- )(((super )?slowed( [&+] reverb)?)|(sped up)|(reverb))\\)?$#i"
        // https://regex101.com/r/TQNFSB/1
    }
}
function set_config() {
    GM_setValue("artist_dumper_config", JSON.stringify(config));
}


async function get_all_songs(auth_token, artist_id) {
    async function get_all_albums() {
        async function request_albums(last_song, roles, types) {
            const r = await fetch("https://pipe.deezer.com/api", {
                "headers": {
                    "authorization": "Bearer "+auth_token,
                    "Content-Type": "application/json"
                },
                "body": JSON.stringify({
                    "operationName": "ArtistDiscographyByType",
                    "variables": {
                        "artistId": artist_id,
                        "nb": 500,
                        "cursor": last_song,
                        "subType": null,
                        "roles": roles,
                        "order": config.order,
                        "types": types
                    },
                    "query": "query ArtistDiscographyByType($artistId: String!, $nb: Int!, $roles: [ContributorRoles!]!, $types: [AlbumTypeInput!]!, $subType: AlbumSubTypeInput, $cursor: String, $order: AlbumOrder) {\n  artist(artistId: $artistId) {\n    albums(\n      after: $cursor\n      first: $nb\n      onlyCanonical: true\n      roles: $roles\n      types: $types\n      subType: $subType\n      order: $order\n    ) {\n      edges {\n        node {\n          ...AlbumBase\n        }\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n}\n\nfragment AlbumBase on Album {\n  id\n  displayTitle\n}"
                }),
                "method": "POST",
            });
            const resp = await r.json();
            return resp.data;
        }

        async function get_albums(last_song) { // everything is an album
            let roles = ["MAIN"];
            let types = [];

            if (config.toggles.featured && config.toggles.ep && config.toggles.singles && config.toggles.album) { // everything is ticked
                roles.push("FEATURED")
                types.push("EP", "SINGLES", "ALBUM");
                return await request_albums(last_song, roles, types);
            }

            let data = null

            if (config.toggles.ep) types.push("EP");
            if (config.toggles.singles) types.push("SINGLES");
            if (config.toggles.album) types.push("ALBUM");
            // types.length must be < 3 if featured was ticked
            if (types.length > 0) data = await request_albums(last_song, roles, types);

            if (config.toggles.featured) { // featured is ticked, but maybe there are other options (not all though) ticked as well, but as featured gets every type, we need to get the other types seperately
                roles = ["FEATURED"];
                types = ["EP", "SINGLES", "ALBUM"];
                if (data !== null) { // if other types where ticked, we append the featured songs, the data object is still from the normal search though, so if there are more featured songs, we won't get them (there shouldnt be more than 500 though)
                    data.artist.albums.edges.push( ...(await request_albums(last_song, roles, types)).artist.albums.edges );
                } else { // only featured was ticked
                    data = await request_albums(last_song, roles, types);
                }
            }

            return data;
        }



        const albums = [];

        let data = await get_albums(null);
        for (let album of data.artist.albums.edges) {
            albums.push([album.node.id, album.node.displayTitle]);
        }
        // could prob do it better recursively
        // this is a bit broken if not everything is ticked as we sometimes send 2 requests for featured and everything else.
        // the main data is from everything else, the featured songs just get appended.
        // so the nextpage/cursor attributes are from the non featured songs, meaning if there are more featured songs (which shouldnt happen), we will miss them.
        while (data.artist.albums.pageInfo.hasNextPage) {
            data = await get_albums(data.artist.albums.pageInfo.endCursor);
            for (let album of data.artist.albums.edges) {
                albums.push([album.node.id, album.node.displayTitle]);
            }
        }
        return albums;
    }


    async function get_all_songs_from_album(album_id) {
        const r = await fetch("https://www.deezer.com/ajax/gw-light.php?method=song.getListByAlbum&input=3&api_version=1.0&api_token="+get_api_token(), {
            "body": JSON.stringify({
                "alb_id": album_id,
                "start": 0,
                "nb": 500
            }),
            "method": "POST",
            "credentials": "include"
        });
        const resp = await r.json();
        const album_songs = [];
        for (let album_song of resp.results.data) {
            let is_from_artist = false;
            for (let artist of album_song.ARTISTS) {
                if (artist.ART_ID === artist_id) {
                    is_from_artist = true;
                    break;
                }
            }
            if (is_from_artist) {
                album_songs.push([album_song.SNG_ID, `${album_song.SNG_TITLE} ${album_song.VERSION}`]);
            }

        }
        return album_songs;
    }

    // get all songs from albums asynchronous, 10 at a time to avoid ratelimits
    const albums = await get_all_albums();
    let songs = {};
    let promises = [];

    for (let i = 0; i < albums.length; i += 10) {
        const chunk = albums.slice(i, i + 10);

        let albumPromises = chunk.map(async album => {
            output(INFO, "Getting songs for " + album[1]);
            const albumSongs = await get_all_songs_from_album(album[0]);
            for (let song of albumSongs) {
                songs[song[0]] = song[1];
            }
        });

        await Promise.all(albumPromises);
    }

    for (let last_dump_song_id of last_dump_song_ids) {
        if (songs[last_dump_song_id] !== undefined) {
            output(INFO, `${songs[last_dump_song_id]} was present in another dump`);
            delete songs[last_dump_song_id];
        }
    }
    return songs;

}

async function create_playlist(songs, artist_name) {
    const time = new Date()
    const formatted_time = time.toLocaleDateString();
    const r = await fetch("https://www.deezer.com/ajax/gw-light.php?method=playlist.create&input=3&api_version=1.0&api_token="+get_api_token(), {
        "body": JSON.stringify({
            "title": artist_name,
            "description": `A playlist containing all of ${artist_name} songs as of ${formatted_time}.`,
            "songs": songs.map((s) => [s]),
            "status": 1
        }),
        "method": "POST",
    });
    const resp = await r.json();
    return resp;

}

async function add_songs_to_playlist(playlist_id, songs) {
    const r = await fetch("https://www.deezer.com/ajax/gw-light.php?method=playlist.addSongs&input=3&api_version=1.0&api_token="+get_api_token(), {
        "body": JSON.stringify({
            "playlist_id": playlist_id,
            "songs": songs.map((s) => [s, 0]),
            "offset": -1,
            "ctxt": {
                "id": null,
                "t": null,
            }
        }),
        "method": "POST",
        "credentials": "include"
    });
    const resp = await r.json();
    return resp;
}

async function update_playlist_picture_to_current_artist(playlist_id) {
    const img_url = document.querySelector("#page_naboo_artist > div.container > div > div > div > img").src
    let r = await fetch(img_url);
    const img_blob = await r.blob();
    const form_data = new FormData();
    form_data.append("image", img_blob, "img.jpg")

    r = await fetch(`https://upload.deezer.com/?sid=${user_data.results.SESSION_ID}&id=${playlist_id}&resize=1&directory=playlist&type=picture&referer=FR&file=img.jpg`, {
        "body": form_data,
        "method": "POST",
    });
    const resp = await r.json()
    return resp;
}


async function get_songs_in_playlist(playlist_id) {
    const r = await fetch("https://www.deezer.com/ajax/gw-light.php?method=playlist.getSongs&input=3&api_version=1.0&api_token="+get_api_token(), {
        "body": JSON.stringify({
            "playlist_id": playlist_id,
            "start": 0,
            "nb": 2000
        }),
        "method": "POST",
        "credentials": "include"
    });
    const resp = await r.json()
    return resp;
}



function validate_regex(regex_str) {
    try {
        const l = regex_str.split("#")
        const flags = l[l.length-1]
        regex_str = regex_str.substr(0, regex_str.length-flags.length-1) // remove the flags
        return RegExp(regex_str, flags);
    } catch (e) {
        return null;
    }
}

function download_dump(data, time) {
    const formatted_time = time.toLocaleString('sv-SE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).replaceAll("-", "").replaceAll(':', '').replace(" ", "_");

    const link = document.createElement('a');
    link.download = `artistdump_${get_current_artist_name().replaceAll(" ", "_")}_${formatted_time}.json`;

    if (typeof(data) === "object") {
        data = JSON.stringify(data, null, 4)
    }
    const blob = new Blob([data], { type: 'application/json' });

    link.href = URL.createObjectURL(blob);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


async function submit() {
    const start_time = Date.now();

    set_config();

    let regexes_str = config.regexes.split(/(?<!\\)\n/); // match \n but not \\n
    const regexes = []
    for (let regex_str of regexes_str) {
        let regex = validate_regex(regex_str);
        if (regex === null) {
            output(ERROR, `Regex "${regex_str}" is not valid, exiting`, true);
            return;
        }
        regexes.push(regex);
    }

    download_btn?.remove(); // only remove if new data is there in case the user forgot to download from the last run

    output(INFO, "Regexes valid", true);

    const data = {
        artist_id: get_current_artist_id(),
        regexes: regexes_str,
        song_ids: []
    }
    download_btn = create_download_btn(data, new Date()); // reference to data not data
    main_div.appendChild(download_btn);

    const auth_token = await get_auth_token();

    output(INFO, "Getting songs");
    const songs = await get_all_songs(auth_token, data.artist_id);

    let text = "";

    const selected_playlist_id = selected_playlist.getAttribute("data-id")
    if (selected_playlist_id !== "-1") {
        const songs_already_in_playlist = await get_songs_in_playlist(selected_playlist_id);
        if (songs_already_in_playlist.error.length === 0) {
            for (let song_already_in_playlist of songs_already_in_playlist.results.data) {
                if (songs[song_already_in_playlist.SNG_ID] !== undefined) {
                    output(INFO, `${songs[song_already_in_playlist.SNG_ID]} is already in the playlist`);
                    delete songs[song_already_in_playlist.SNG_ID];
                }
            }
        }
    }

    for (let song of Object.entries(songs)) {
        let is_blacklisted = false;

        for (let regex of regexes) {
            if (regex.test(song[1]) === true) {
                is_blacklisted = true;
                output(INFO, `${song[1]} is blacklisted`);
                console.log(`${song[1]} matched ${regex.toString()}`);
                break;
            }
        }

        if (!is_blacklisted) {
            data.song_ids.push(song[0]);
            text+=song[1]+", ";
        }
    }

    if (data.song_ids.length === 0) {
        output(INFO, "There are no songs to add, exiting");
        return;
    }
    data.song_ids.reverse(); // sorting playlist afterwards doesnt really work as we add all songs at the same time so we need to sort it here since the order we receive is fifo but we need filo (basically)

    const artist_name = get_current_artist_name();
    if (selected_playlist.getAttribute("data-id") === "-1") {
        output(INFO, "Creating new playlist for "+artist_name);
        output(INFO, `Adding ${data.song_ids.length} songs (${text.substr(0, text.length-3)})`);

        let r = await create_playlist(data.song_ids, artist_name);
        if (r.error.length !== 0) {
            output(ERROR, "Failed to create playlist, see console");
            console.error("Failed to create playlist", r.error);
            return;
        }
        output(SUCCESS, "Created playlist with songs in it");

        r = await update_playlist_picture_to_current_artist(r.results)
        if (r.error.length !== 0) {
            output(ERROR, "Failed to add picture to playlist, see console");
            console.error("Failed to add picture to playlist", r.error);
            return;
        }

        output(SUCCESS, "Added picture to playlist");
        output(SUCCESS, "Finished");

    } else {
        output(INFO, "Adding songs to "+selected_playlist.textContent);
        output(INFO, `Adding ${data.song_ids.length} songs (${text.substr(0, text.length-3)})`);


        let r = await add_songs_to_playlist(selected_playlist.getAttribute("data-id"), data.song_ids);
        if (r.error.length !== 0) {
            console.error("Failed to add songs to playlist", r.error);
            if (r.error.ERROR_DATA_EXISTS !== undefined) {
                output(ERROR, "Failed to add songs as at least 1 song is already in playlist");
            } else {
                output(ERROR, "Failed to add songs to playlist, see console");
            }
            return;
        }

        output(SUCCESS, "Added songs to playlist "+selected_playlist.textContent);
        output(SUCCESS, "Finished");
    }
    output(INFO, `Process took ${(Date.now()-start_time)/1000} seconds.`);
    download_btn.click();

}



// more or less only visual stuff


function output(type, text, clean) {
    let time = new Date();
    if (clean) {
        output_textarea.value = "";
    }
    output_textarea.value += `[${time.toLocaleTimeString()}] [${type}] ${text}\n`
    output_textarea.scrollTop = output_textarea.scrollHeight;
}


function change_selected_playlist(new_playlist) {
    if (new_playlist !== selected_playlist) {
        selected_playlist?.removeAttribute("selected");
        new_playlist.setAttribute("selected", "");
        selected_playlist = new_playlist;
    }
}


function create_main_btn(main_div) {
    const main_btn = document.createElement("button");
    main_btn.innerHTML = `
<button type="button" class="main_btn">
    <svg viewBox="0 0 24 24">
        <path
            fill-rule="evenodd" d="M11.335 11.335V4h1.33v7.335H20v1.33h-7.335V20h-1.33v-7.335H4v-1.33h7.335Z" clip-rule="evenodd">
        </path>
    </svg>
</button>`
    let show = false;
    main_btn.onclick = () => {
        show = !show
        main_div.style.display = show ? "block" : "none";
        main_btn.querySelector("button").className = show ? "main_btn active": "main_btn";
    }
    return main_btn;
}


function create_main_div() {
    const main_div = document.createElement("div");
    main_div.className = "main_div";
    return main_div;
}


function create_blacklist_textarea() {
    const blacklist_textarea = document.createElement("textarea");
    blacklist_textarea.className = "my_textarea";
    blacklist_textarea.placeholder = "Regex pattern(s) to blacklist song titles. Javascript flags are the last part, seperated from the rest by a # (e.g. #igd). If a regex is invalid the whole process will be stopped before adding songs. 1 Pattern/Line";
    blacklist_textarea.title = "Regex pattern(s) to blacklist song titles. Javascript flags are the last part, seperated from the rest by a # (e.g. #igd). If a regex is invalid the whole process will be stopped before adding songs. 1 Pattern/Line";
    blacklist_textarea.value = config.regexes;
    blacklist_textarea.spellcheck = false;
    blacklist_textarea.oninput = () => {
        config.regexes = blacklist_textarea.value;
    }

    return blacklist_textarea;
}


function create_song_types_options() {
    const options_ul = document.createElement("ul");
    options_ul.className = "toggles";
    options_ul.role = "group";
    options_ul.setAttribute("data-orientation", "horizontal");

    const types = ["EP", "Singles", "Album", "Featured"]
    let inpt, lbl;
    for (let type of types) {
        inpt = document.createElement("input");
        inpt.type = "checkbox";
        inpt.title = `Wether to include ${type} or not`

        lbl = document.createElement("label");
        lbl.textContent = type;

        type = type.toLowerCase();

        inpt.checked = config.toggles[type]
        inpt.onclick = () => {
            config.toggles[type] = !config.toggles[type];
        }

        options_ul.append(lbl, inpt);
    }


    const opts = [document.createElement('option'), document.createElement('option')];
    opts[0].textContent = "Release Date";
    opts[1].textContent = "Popularity";

    const order_dropdown = document.createElement("select");
    order_dropdown.className = "my_dropdown";
    order_dropdown.title = "Order of songs. Does not really affect anything as the songs get added all at once so deezer sorts them by song_id internally which is MOSTLY equal to release date, but can have exceptions.";
    order_dropdown.append(...opts)
    order_dropdown.onchange = () => { // since we only have two elements, we know that if it changes it is the other option
        config.order = config.order === "RELEASE_DATE" ? "RANK" : "RELEASE_DATE";
    }

    options_ul.appendChild(order_dropdown);

    return options_ul;
}

function create_search_bar(playlists, playlist_ul) {
    let inpt = document.createElement("input")
    inpt.placeholder = "Search Playlist";
    inpt.className = "searchbar";
    inpt.oninput = (e) => {
        for (let playlist of playlists) {
            playlist_ul.querySelector(`button[data-id='${playlist.PLAYLIST_ID}']`).style.display = playlist.TITLE.toLowerCase().includes(inpt.value.toLowerCase()) ? "" : "none";
        }
    }
    return inpt;
}


function create_new_playlist_btn() {
    const new_playlist_btn = document.createElement("button");
    new_playlist_btn.type = "button";
    new_playlist_btn.className = "new_playlist_btn";
    new_playlist_btn.title = "(Recommended) Creates a new private playlist with the name and picture of the artist where the songs will be added to.";
    new_playlist_btn.setAttribute("data-id", "-1");
    new_playlist_btn.innerHTML = `
<span>
    <svg viewBox="0 0 24 24">
        <path
            fill-rule="evenodd" d="M11.335 11.335V4h1.33v7.335H20v1.33h-7.335V20h-1.33v-7.335H4v-1.33h7.335Z" clip-rule="evenodd">
        </path>
    </svg>
</span>
<span>New Playlist</span>`

    new_playlist_btn.onclick = () => {
        change_selected_playlist(new_playlist_btn);
    }
    return new_playlist_btn;
}


function create_playlists_btns(playlists, new_playlist_btn) {
    const playlist_ul = document.createElement("ul");
    playlist_ul.className = "playlist_ul";

    let playlist_li = document.createElement("li");
    playlist_li.appendChild(new_playlist_btn);
    playlist_ul.appendChild(playlist_li);

    let playlist, playlist_btn;
    for (playlist of playlists) {
        playlist_btn = document.createElement("button");
        playlist_btn.title = `Add the songs to ${playlist.TITLE}`
        playlist_btn.textContent = playlist.TITLE
        playlist_btn.onclick = (e) => {
            change_selected_playlist(e.target);
        }
        playlist_btn.setAttribute("data-id", playlist.PLAYLIST_ID);

        playlist_li = document.createElement("li");
        playlist_li.appendChild(playlist_btn);

        playlist_ul.appendChild(playlist_li);
    }
    return playlist_ul;
}


function create_submit_btn() {
    const submit_btn = document.createElement("button");
    submit_btn.textContent = "Submit";
    submit_btn.className = "action_btn";
    submit_btn.style.top = "10px";
    submit_btn.style.marginBottom = "10px";
    submit_btn.title = "Starts the whole process. The settings (regex, checkboxes) will be saved locally for the next use."
    submit_btn.onclick = submit;

    return submit_btn;
}


function create_output_textarea() {
    const output_textarea = document.createElement("textarea");
    output_textarea.className = "my_textarea";
    output_textarea.placeholder = "Output (Click to Copy)";
    output_textarea.title = "Outputs information about the progess. Click to Copy.";
    output_textarea.readOnly = true;
    output_textarea.onmouseup = () => {
        if (window.getSelection().toString() === "") {
            navigator.clipboard.writeText(output_textarea.value);
        }
    }

    return output_textarea;
}


function create_load_btn(data, time) {
    const file_inpt = document.createElement("input");
    file_inpt.type = "file";
    file_inpt.multiple = true;
    file_inpt.style.display = "none";

    const load_btn = document.createElement("button");
    load_btn.textContent = "Load Dump";
    load_btn.className = "action_btn";
    load_btn.title = "Load data from an earlier dump."
    load_btn.onclick = () => {
        file_inpt.click();
    };

    file_inpt.onchange = (e) => {
        last_dump_song_ids = [];
        const files = e.target.files;
        load_btn.textContent = "0 Dumps (Check JSON/console)";
        load_btn.title = "";

        const readers = [];
        for (let file of files) {
            const reader = new FileReader();
            readers.push(reader);
            reader.readAsText(file, "UTF-8");
            reader.onerror = e => {
                console.error("File reading error:", e);
            };
            reader.onload = re => {
                let last_dump;
                try {
                    last_dump = JSON.parse(re.target.result);
                } catch (e) {
                    output(ERROR, "Error parsing dump "+file.name);
                    console.error("Error parsing dump "+file.name, e);
                    return;
                }

                last_dump_song_ids = [...last_dump_song_ids, ...last_dump.song_ids];
                const file_count = Number(load_btn.textContent.split(" ", 1)[0] ) + 1;
                load_btn.textContent = file_count.toString() + " Dump" + (file_count > 1 ? "s": "");
                load_btn.title += file.name+"\n";
            }
        }

        const wait_for_readers = setInterval(() => { // race condition but ig the file loading should always be quicker than the user pressing submit
            if (readers.every(v => v.result !== null)) {
                clearInterval(wait_for_readers);
                last_dump_song_ids = [...new Set(last_dump_song_ids)]; // deduplicate
            }
        }, 10)
    }
    return load_btn;
}


function create_download_btn(data, time) {
    const download_btn = document.createElement("button");
    download_btn.textContent = "Download Dump";
    download_btn.className = "action_btn";
    download_btn.title = "Download data for this dump.";
    download_btn.style.marginTop = "1px";
    download_btn.onclick = () => download_dump(data, time);

    return download_btn;
}

// globals
let config;
let selected_playlist;
let user_data;
let output_textarea;
let main_div;
let download_btn;
let last_dump_song_ids;

const ERROR = "!";//"ERROR";
const INFO = "?";//"INFO";
const SUCCESS = "*";//"SUCCESS";

let last_url = location.href;
navigation.addEventListener('navigate', (e) => {
    const target_url = e.destination.url;
    console.log("change", last_url, target_url);

    const last_id = last_url.split("/artist/")
    const target_id = target_url.split("/artist/");
    if (target_id.length > 1) { // current page is an artist
        if (last_id.length > 1) { // the last page was also an artist
            if (target_id[1].split("/", 1)[0] !== last_id[1].split("/", 1)[0]) { // the current and last artist arent the same
                main();
            }
        } else {
            main();
        }

    }

    last_url = target_url;
});
if (location.pathname.includes("/artist/")) {
    main();
}

async function main() {
    user_data = await get_user_data();
    let main_ul;
    const wait = setInterval(() => {
        console.log("waiting");
        main_ul = document.querySelector("#page_naboo_artist > div.container > div > ul[role='group']");
        if (main_ul !== null) {
            clearInterval(wait);
            console.log("found");
            if (document.querySelector(".main_btn") !== null) {
                return;
            }

            config = get_config()
            last_dump_song_ids = [];

            set_css();
            main_ul.style.position = "relative";

            main_div = create_main_div();
            const blacklist_textarea = create_blacklist_textarea();
            const options_ul = create_song_types_options();


            let new_playlist_btn = create_new_playlist_btn();
            new_playlist_btn.setAttribute("selected", "");
            selected_playlist = new_playlist_btn;

            const playlists = get_playlists()
            const playlist_ul = create_playlists_btns(playlists, new_playlist_btn);
            const search_bar = create_search_bar(playlists, playlist_ul);

            const submit_btn = create_submit_btn();
            const load_btn = create_load_btn();
            output_textarea = create_output_textarea();
            const main_btn = create_main_btn(main_div);

            main_div.append(blacklist_textarea, options_ul, search_bar, playlist_ul, submit_btn, output_textarea, load_btn);
            main_ul.append(main_btn, main_div);
        }
    }, 200)
}
