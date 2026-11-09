#!/bin/bash
# itch_dl.sh <slug> <name-substring> <out.zip>  — безкоштовне завантаження з quaternius.itch.io
set -e
G=https://quaternius.itch.io/$1; J=$(mktemp); P=$(mktemp)
curl -s -c $J -b $J --max-time 30 $G -o $P
T=$(grep -o '<meta name="csrf_token" value="[^"]*"' $P | sed 's/.*value="//;s/"$//')
U=$(curl -s -c $J -b $J --max-time 30 -X POST --data-urlencode "csrf_token=$T" $G/download_url | python3 -I -c "import json,sys;print(json.load(sys.stdin)['url'])")
curl -s -c $J -b $J --max-time 30 "$U" -o $P
T=$(grep -o '<meta name="csrf_token" value="[^"]*"' $P | sed 's/.*value="//;s/"$//')
python3 -I - $P <<'PY' >&2
import re,sys;s=open(sys.argv[1],errors='replace').read()
for m in re.finditer(r'data-upload_id="(\d+)".{0,600}?title="([^"]+)".{0,200}?file_size"><span>([^<]+)',s,re.S):print(' ',m.group(1),m.group(2),m.group(3))
PY
ID=$(python3 -I - $P "$2" <<'PY'
import re,sys;s=open(sys.argv[1],errors='replace').read()
for m in re.finditer(r'data-upload_id="(\d+)".{0,600}?title="([^"]+)"',s,re.S):
  if sys.argv[2] in m.group(2):print(m.group(1));break
PY
)
[ -n "$ID" ] || { echo "no upload matching $2" >&2; exit 1; }
F=$(curl -s -c $J -b $J --max-time 30 -X POST --data-urlencode "csrf_token=$T" "$G/file/$ID?source=game_download" | python3 -I -c "import json,sys;print(json.load(sys.stdin)['url'])")
curl -s --max-time 600 -o "$3" "$F"
rm -f $J $P; ls -la "$3"
