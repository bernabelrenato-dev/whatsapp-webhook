import urllib.request
import json

token = "4VvHvnfBsBZUPQNwkfnbZF2q"
account_id = "1"
inbox_id = 1
phone = "+51936473437"
name = "Renatogod Test"

headers = {
    "api_access_token": token,
    "Content-Type": "application/json"
}

# Call localhost:3010 to bypass Nginx
req_search = urllib.request.Request(
    f"http://localhost:3010/api/v1/accounts/{account_id}/contacts/search?q={phone}",
    headers=headers
)

try:
    with urllib.request.urlopen(req_search) as res:
        data = json.loads(res.read().decode())
        contacts = data.get("payload", [])
        print("Search Results (Localhost):", len(contacts))
        
        contact_id = None
        if contacts:
            contact_id = contacts[0]["id"]
            print("Found Contact ID:", contact_id)
            
        if not contact_id:
            # Create contact
            create_payload = json.dumps({
                "inbox_id": inbox_id,
                "name": name,
                "phone_number": phone
            }).encode()
            req_create = urllib.request.Request(
                f"http://localhost:3010/api/v1/accounts/{account_id}/contacts",
                data=create_payload,
                headers=headers,
                method="POST"
            )
            with urllib.request.urlopen(req_create) as res_create:
                create_data = json.loads(res_create.read().decode())
                contact_id = create_data["payload"]["contact"]["id"]
                print("Created Contact ID:", contact_id)
                
        # Get/Create conversation
        conv_payload = json.dumps({
            "inbox_id": inbox_id,
            "contact_id": contact_id
        }).encode()
        req_conv = urllib.request.Request(
            f"http://localhost:3010/api/v1/accounts/{account_id}/conversations",
            data=conv_payload,
            headers=headers,
            method="POST"
        )
        with urllib.request.urlopen(req_conv) as res_conv:
            conv_data = json.loads(res_conv.read().decode())
            conversation_id = conv_data["id"]
            print("Conversation ID:", conversation_id)
            
        # Create message
        msg_payload = json.dumps({
            "content": "Test incoming message from script local",
            "message_type": "incoming",
            "private": False
        }).encode()
        req_msg = urllib.request.Request(
            f"http://localhost:3010/api/v1/accounts/{account_id}/conversations/{conversation_id}/messages",
            data=msg_payload,
            headers=headers,
            method="POST"
        )
        with urllib.request.urlopen(req_msg) as res_msg:
            msg_data = json.loads(res_msg.read().decode())
            print("Message created successfully. ID:", msg_data["id"])
            
except Exception as e:
    print("Error:", e)
