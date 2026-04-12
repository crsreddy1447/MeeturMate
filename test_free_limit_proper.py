#!/usr/bin/env python3
"""
Proper test for free user limit enforcement
"""

import requests
import json

BACKEND_URL = "https://soulmate-ai-24.preview.emergentagent.com/api"

def test_free_user_limit_properly():
    """Test free user limit with a fresh user"""
    
    # Create a new test user
    new_user_data = {
        "email": "testlimit@test.com",
        "password": "password123",
        "name": "TestLimit",
        "age": 25,
        "gender": "male",
        "bio": "Testing free user limits",
        "location": "Test City"
    }
    
    print("Creating new test user for limit testing...")
    response = requests.post(f"{BACKEND_URL}/auth/register", json=new_user_data)
    
    if response.status_code != 200:
        print(f"Failed to create test user: {response.status_code} - {response.text}")
        return False
        
    user_data = response.json()
    token = user_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"Created user with ID: {user_data['user_id']}")
    
    # Get existing user IDs from test credentials
    with open("/app/memory/test_credentials.md", "r") as f:
        content = f.read()
    
    # Extract user IDs
    lines = content.split('\n')
    user_ids = []
    for line in lines:
        if "User ID:" in line:
            user_id = line.split("User ID: ")[1].strip()
            user_ids.append(user_id)
    
    print(f"Found existing user IDs: {user_ids}")
    
    if len(user_ids) < 3:
        print("Not enough existing users to test limit")
        return False
    
    # Test messaging first user (should work)
    print("\nTesting message to first user (should work)...")
    message_data = {
        "receiver_id": user_ids[0],
        "content": "First message - should work",
        "message_type": "text"
    }
    
    response = requests.post(f"{BACKEND_URL}/messages/send", json=message_data, headers=headers)
    print(f"First message status: {response.status_code}")
    
    if response.status_code != 200:
        print(f"First message failed: {response.text}")
        return False
    
    # Test messaging second user (should work)
    print("\nTesting message to second user (should work)...")
    message_data = {
        "receiver_id": user_ids[1],
        "content": "Second message - should work",
        "message_type": "text"
    }
    
    response = requests.post(f"{BACKEND_URL}/messages/send", json=message_data, headers=headers)
    print(f"Second message status: {response.status_code}")
    
    if response.status_code != 200:
        print(f"Second message failed: {response.text}")
        return False
    
    # Check user's active conversations
    response = requests.get(f"{BACKEND_URL}/auth/me", headers=headers)
    if response.status_code == 200:
        user_info = response.json()
        print(f"Active conversations: {user_info.get('active_conversations', [])}")
    
    # Test messaging third user (should fail)
    print("\nTesting message to third user (should fail)...")
    message_data = {
        "receiver_id": user_ids[2],
        "content": "Third message - should fail",
        "message_type": "text"
    }
    
    response = requests.post(f"{BACKEND_URL}/messages/send", json=message_data, headers=headers)
    print(f"Third message status: {response.status_code}")
    print(f"Third message response: {response.text}")
    
    if response.status_code == 403:
        print("✅ Free user limit correctly enforced!")
        return True
    else:
        print("❌ Free user limit NOT enforced!")
        return False

if __name__ == "__main__":
    success = test_free_user_limit_properly()
    print(f"\nTest result: {'PASS' if success else 'FAIL'}")