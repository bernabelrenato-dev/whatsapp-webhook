import urllib.request
import json
import re

url = "http://localhost:8025/api/v2/messages"
try:
    response = urllib.request.urlopen(url)
    data = json.loads(response.read().decode('utf-8'))
    messages = data.get('items', [])
    
    if not messages:
        print("No messages found in MailHog.")
    else:
        print(f"Found {len(messages)} messages in MailHog:\n")
        for i, msg in enumerate(messages):
            sender = msg.get('Raw', {}).get('From', '')
            recipient = msg.get('Raw', {}).get('To', '')
            subject = msg.get('Content', {}).get('Headers', {}).get('Subject', [''])[0]
            body = msg.get('Content', {}).get('Body', '')
            
            print(f"[{i+1}] From: {sender} | To: {recipient} | Subject: {subject}")
            
            # Find URLs in the body
            urls = re.findall(r'https?://[^\s<>"]+|www\.[^\s<>"]+', body)
            if urls:
                print("Links found in email:")
                for u in urls:
                    print(f" - {u}")
            else:
                print("No links found in body.")
            print("-" * 50)
except Exception as e:
    print(f"Error connecting to MailHog: {e}")
