# place in same folder as dumps, backup old dumps before doing anything

import json
import os
from datetime import datetime

path = os.path.abspath(os.path.dirname(__file__))+"/"

dumps = {}

for file in os.listdir(path):
    if os.path.isfile(path+file) and file.endswith(".json"):
        with open(path+file, "r") as f:
            data = json.loads(f.read())
            if not data["artist_id"] in dumps:
                dumps[data["artist_id"]] = {
                    "artist_name": data.get("artist_name", file.split("_", 2)[1]), # if the name is not in the dump, it tries to get it from the file name 
                    "artist_id": data["artist_id"],
                    "regexes": set(data["regexes"]),
                    "song_ids": set(data["song_ids"]),
                }
            else:
                dumps[data["artist_id"]]["song_ids"].update(data["song_ids"])
                dumps[data["artist_id"]]["regexes"].update(data["regexes"])

timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
for dump in dumps.values():
    dump["regexes"] = list(dump["regexes"])
    dump["song_ids"] = list(dump["song_ids"])
    
    filename = f"artistdump_{dump['artist_name']}_{timestamp}.json"
    with open(path+filename, "w") as f:
        f.write(json.dumps(dump, indent=4))
