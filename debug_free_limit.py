#!/usr/bin/env python3
"""
Debug script to check free user limit issue
"""

import requests
import json

BACKEND_URL = "https://soulmate-ai-24.preview.emergentagent.com/api"

# Read test credentials
with open("/app/memory/test_credentials.md", "r") as f:
    content = f.read()
    print("Test credentials content:")
    print(content)

# Extract John's token (assuming it's in the file)
lines = content.split('\n')
john_token = None
sarah_id = None
emma_id = None

for i, line in enumerate(lines):
    if "User John:" in line:
        # Look for token in next few lines
        for j in range(i+1, min(i+6, len(lines))):
            if "Token:" in lines[j]:
                john_token = lines[j].split("Token: ")[1].strip()
                break
    elif "User Sarah:" in line:
        for j in range(i+1, min(i+6, len(lines))):
            if "User ID:" in lines[j]:
                sarah_id = lines[j].split("User ID: ")[1].strip()
                break
    elif "User Emma:" in line:
        for j in range(i+1, min(i+6, len(lines))):
            if "User ID:" in lines[j]:
                emma_id = lines[j].split("User ID: ")[1].strip()
                break

print(f"John token: {john_token}")
print(f"Sarah ID: {sarah_id}")
print(f"Emma ID: {emma_id}")

if john_token:
    # Check John's current user data
    headers = {"Authorization": f"Bearer {john_token}"}
    response = requests.get(f"{BACKEND_URL}/auth/me", headers=headers)
    
    if response.status_code == 200:
        user_data = response.json()
        print(f"\nJohn's current data:")
        print(f"is_premium: {user_data.get('is_premium')}")
        print(f"active_conversations: {user_data.get('active_conversations')}")
        print(f"free_chat_count: {user_data.get('free_chat_count')}")
    else:
        print(f"Failed to get John's data: {response.status_code}")
        
    # Try to send message to Emma again and see the exact response
    if emma_id:
        message_data = {
            "receiver_id": emma_id,
            "content": "Testing free user limit",
            "message_type": "text"
        }
        
        response = requests.post(f"{BACKEND_URL}/messages/send", 
                               json=message_data, headers=headers)
        
        print(f"\nAttempt to message Emma:")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")