"""
MeeturMate API Backend Tests
Tests for: Auth, Questionnaire, Matches, Chat/Messages, Profile
"""
import pytest
import requests
import os
from datetime import datetime

# For backend tests, we use the public URL from frontend .env or default to preview URL
BASE_URL = "https://soulmate-ai-24.preview.emergentagent.com"

# Test data
TEST_USER_1 = {
    "email": f"test_user_1_{datetime.now().timestamp()}@test.com",
    "password": "testpass123",
    "name": "Test User One",
    "age": 25,
    "gender": "male",
    "bio": "Test bio for user 1",
    "location": "New York, USA"
}

TEST_USER_2 = {
    "email": f"test_user_2_{datetime.now().timestamp()}@test.com",
    "password": "testpass123",
    "name": "Test User Two",
    "age": 27,
    "gender": "female",
    "bio": "Test bio for user 2",
    "location": "Los Angeles, USA"
}

# Store tokens and user IDs for cleanup
test_tokens = []
test_user_ids = []

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestAuth:
    """Authentication endpoint tests"""
    
    def test_register_user_1(self, api_client):
        """Test user registration for user 1"""
        response = api_client.post(f"{BASE_URL}/api/auth/register", json=TEST_USER_1)
        assert response.status_code == 200, f"Registration failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert "user_id" in data
        assert data["token_type"] == "bearer"
        
        # Store for later tests
        test_tokens.append(data["access_token"])
        test_user_ids.append(data["user_id"])
        print(f"✓ User 1 registered successfully: {data['user_id']}")
    
    def test_register_user_2(self, api_client):
        """Test user registration for user 2"""
        response = api_client.post(f"{BASE_URL}/api/auth/register", json=TEST_USER_2)
        assert response.status_code == 200, f"Registration failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert "user_id" in data
        
        test_tokens.append(data["access_token"])
        test_user_ids.append(data["user_id"])
        print(f"✓ User 2 registered successfully: {data['user_id']}")
    
    def test_register_duplicate_email(self, api_client):
        """Test registration with duplicate email fails"""
        response = api_client.post(f"{BASE_URL}/api/auth/register", json=TEST_USER_1)
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()
        print("✓ Duplicate email registration blocked correctly")
    
    def test_login_success(self, api_client):
        """Test login with correct credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_1["email"],
            "password": TEST_USER_1["password"]
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "access_token" in data
        assert "user_id" in data
        print("✓ Login successful")
    
    def test_login_wrong_password(self, api_client):
        """Test login with wrong password fails"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_1["email"],
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Wrong password rejected correctly")
    
    def test_get_current_user(self, api_client):
        """Test GET /api/auth/me returns current user"""
        token = test_tokens[0]
        response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        user = response.json()
        assert user["email"] == TEST_USER_1["email"]
        assert user["name"] == TEST_USER_1["name"]
        assert user["age"] == TEST_USER_1["age"]
        assert "password_hash" not in user
        assert user["is_premium"] == False
        assert user["questionnaire_completed"] == False
        print("✓ GET /api/auth/me working correctly")


class TestQuestionnaire:
    """Questionnaire endpoint tests"""
    
    def test_get_questions(self, api_client):
        """Test GET /api/questionnaire/questions"""
        response = api_client.get(f"{BASE_URL}/api/questionnaire/questions")
        assert response.status_code == 200
        
        data = response.json()
        assert "questions" in data
        assert len(data["questions"]) == 8
        
        # Verify question structure
        q = data["questions"][0]
        assert "id" in q
        assert "question" in q
        assert "type" in q
        assert "options" in q
        print(f"✓ Questionnaire has {len(data['questions'])} questions")
    
    def test_submit_questionnaire_user_1(self, api_client):
        """Test questionnaire submission for user 1"""
        token = test_tokens[0]
        responses = {
            "q1": "Serious Relationship",
            "q2": "Coffee shop",
            "q3": ["Reading", "Sports", "Traveling"],
            "q4": ["Humor", "Intelligence", "Kindness"],
            "q5": "Regular calls",
            "q6": "Maybe",
            "q7": "Balanced",
            "q8": "Bachelor's"
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/questionnaire/submit",
            json={"responses": responses},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        assert "message" in response.json()
        print("✓ User 1 questionnaire submitted")
        
        # Verify user is marked as completed
        user_response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert user_response.json()["questionnaire_completed"] == True
        print("✓ User marked as questionnaire_completed")
    
    def test_submit_questionnaire_user_2(self, api_client):
        """Test questionnaire submission for user 2"""
        token = test_tokens[1]
        responses = {
            "q1": "Dating",
            "q2": "Restaurant dinner",
            "q3": ["Cooking", "Music", "Traveling"],
            "q4": ["Kindness", "Honesty", "Humor"],
            "q5": "Texting all day",
            "q6": "Yes",
            "q7": "Social butterfly",
            "q8": "Master's"
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/questionnaire/submit",
            json={"responses": responses},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        print("✓ User 2 questionnaire submitted")


class TestMatches:
    """Matching endpoint tests"""
    
    def test_find_matches_user_1(self, api_client):
        """Test POST /api/matches/find for user 1"""
        token = test_tokens[0]
        response = api_client.post(
            f"{BASE_URL}/api/matches/find",
            json={},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "matches" in data
        assert isinstance(data["matches"], list)
        
        # Should find at least user 2
        if len(data["matches"]) > 0:
            match = data["matches"][0]
            assert "match_score" in match
            assert "_id" in match
            assert "name" in match
            assert "password_hash" not in match
            print(f"✓ Found {len(data['matches'])} matches for user 1")
        else:
            print("⚠ No matches found (might be expected if no other users)")
    
    def test_find_matches_with_filters(self, api_client):
        """Test POST /api/matches/find with gender filter"""
        token = test_tokens[0]
        response = api_client.post(
            f"{BASE_URL}/api/matches/find",
            json={"gender": ["female"]},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        # All matches should be female
        for match in data["matches"]:
            assert match["gender"] == "female"
        print(f"✓ Gender filter working: {len(data['matches'])} female matches")
    
    def test_get_matches(self, api_client):
        """Test GET /api/matches"""
        token = test_tokens[0]
        response = api_client.get(
            f"{BASE_URL}/api/matches",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "matches" in data
        print(f"✓ GET /api/matches returned {len(data['matches'])} matches")


class TestChat:
    """Chat and messaging endpoint tests"""
    
    def test_send_first_message(self, api_client):
        """Test sending first message from user 1 to user 2"""
        token = test_tokens[0]
        receiver_id = test_user_ids[1]
        
        response = api_client.post(
            f"{BASE_URL}/api/messages/send",
            json={
                "receiver_id": receiver_id,
                "content": "Hello! This is a test message.",
                "message_type": "text"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        message = response.json()
        assert message["content"] == "Hello! This is a test message."
        assert message["sender_id"] == test_user_ids[0]
        assert message["receiver_id"] == receiver_id
        print("✓ First message sent successfully")
    
    def test_get_conversations(self, api_client):
        """Test GET /api/conversations"""
        token = test_tokens[0]
        response = api_client.get(
            f"{BASE_URL}/api/conversations",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "conversations" in data
        assert len(data["conversations"]) >= 1
        
        conv = data["conversations"][0]
        assert "other_user" in conv
        assert "last_message" in conv
        assert "unread_count" in conv
        print(f"✓ Found {len(data['conversations'])} conversations")
    
    def test_get_messages_in_conversation(self, api_client):
        """Test GET /api/messages/{conversation_id}"""
        token = test_tokens[0]
        
        # First get conversations
        conv_response = api_client.get(
            f"{BASE_URL}/api/conversations",
            headers={"Authorization": f"Bearer {token}"}
        )
        conversations = conv_response.json()["conversations"]
        
        if len(conversations) > 0:
            conv_id = conversations[0]["_id"]
            
            # Get messages
            msg_response = api_client.get(
                f"{BASE_URL}/api/messages/{conv_id}",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert msg_response.status_code == 200
            
            data = msg_response.json()
            assert "messages" in data
            assert len(data["messages"]) >= 1
            print(f"✓ Retrieved {len(data['messages'])} messages from conversation")
    
    def test_free_user_chat_limit(self, api_client):
        """Test free user can only chat with 2 people"""
        # Create a third test user
        test_user_3 = {
            "email": f"test_user_3_{datetime.now().timestamp()}@test.com",
            "password": "testpass123",
            "name": "Test User Three",
            "age": 30,
            "gender": "female",
            "location": "Chicago, USA"
        }
        
        reg_response = api_client.post(f"{BASE_URL}/api/auth/register", json=test_user_3)
        user_3_id = reg_response.json()["user_id"]
        
        # User 1 already has 1 conversation with user 2
        # Try to start a second conversation (should work)
        token = test_tokens[0]
        
        # Send message to user 3 (second conversation - should work)
        response = api_client.post(
            f"{BASE_URL}/api/messages/send",
            json={
                "receiver_id": user_3_id,
                "content": "Second conversation",
                "message_type": "text"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        print("✓ Free user can start 2nd conversation")
        
        # Create user 4 and try to start 3rd conversation (should fail)
        test_user_4 = {
            "email": f"test_user_4_{datetime.now().timestamp()}@test.com",
            "password": "testpass123",
            "name": "Test User Four",
            "age": 28,
            "gender": "female",
            "location": "Miami, USA"
        }
        
        reg_response = api_client.post(f"{BASE_URL}/api/auth/register", json=test_user_4)
        user_4_id = reg_response.json()["user_id"]
        
        # Try to send message to user 4 (third conversation - should fail)
        response = api_client.post(
            f"{BASE_URL}/api/messages/send",
            json={
                "receiver_id": user_4_id,
                "content": "Third conversation attempt",
                "message_type": "text"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 403
        assert "Free users can only chat with 2 people" in response.json()["detail"]
        print("✓ Free user chat limit enforced (max 2 conversations)")


class TestProfile:
    """Profile endpoint tests"""
    
    def test_update_profile(self, api_client):
        """Test PUT /api/profile/update"""
        token = test_tokens[0]
        
        update_data = {
            "bio": "Updated bio for testing",
            "location": "San Francisco, USA"
        }
        
        response = api_client.put(
            f"{BASE_URL}/api/profile/update",
            json=update_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        user = response.json()
        assert user["bio"] == "Updated bio for testing"
        assert user["location"] == "San Francisco, USA"
        print("✓ Profile updated successfully")
        
        # Verify persistence
        get_response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert get_response.json()["bio"] == "Updated bio for testing"
        print("✓ Profile update persisted in database")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
