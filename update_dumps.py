# place in same folder as dumps, backup old dumps before doing anything

import json
import os
from datetime import datetime

path = os.path.abspath(os.path.dirname(__file__))+"/"

for file in os.listdir(path):
    if os.path.isfile(path+file) and file.endswith(".json"):
        with open(path+file, "r") as f:
            data = json.loads(f.read())
            if len(data["regexes"]) > 0 and type(data["regexes"][0]) == str:
                data["regexes"] = [{
                    "str": regex,
                    "flags": "",
                    "type": 0,
                    "applies_to": {
                        "song": True,
                        "artist": False,
                        "album": False
                    }
                } for regex in data["regexes"]]
                with open(path+file, "w") as f:
                    f.write(json.dumps(data, indent=4))
print("Flags are considered to be part of the regex string so you'll need to update/fix that manually")
