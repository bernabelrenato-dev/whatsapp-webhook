import urllib.request
import json

token = "BZD2N8LMyCMAj8FUw3aAT7ALAIjzJvgPyIlRZlh1cde7b375"
domain = "jgispublicidad.pe"

req = urllib.request.Request(
    f"https://developers.hostinger.com/api/dns/v1/zones/{domain}",
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
)

try:
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode())
        print(json.dumps(data, indent=2))
except Exception as e:
    print("Error:", e)
