import urllib.request
import json
req = urllib.request.Request('http://localhost:5000/api/payroll/status')
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read().decode())
    for x in data:
        print(x['employeeName'], x['errorLog'])
