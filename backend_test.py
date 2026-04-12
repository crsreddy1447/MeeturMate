#!/usr/bin/env python3
"""
MeeturMate Dating App Backend API Testing
Tests all backend endpoints for authentication, questionnaire, matching, and messaging
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from frontend environment
BACKEND_URL = "https://soulmate-ai-24.preview.emergentagent.com/api"

class MeeturMateAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.users = {}  # Store user data and tokens
        self.test_results = []
        
    def log_test(self, test_name, success, details=""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })
        
    def test_auth_register(self):
        """Test user registration"""
        print("\n=== Testing Authentication - Registration ===")
        
        # Test data for 3 users
        test_users = [
            {
                "email": "john@test.com",
                "password": "password123",
                "name": "John",
                "age": 28,
                "gender": "male",
                "bio": "Looking for meaningful connections and dating",
                "location": "New York, NY"
            },
            {
                "email": "sarah@test.com", 
                "password": "password123",
                "name": "Sarah",
                "age": 26,
                "gender": "female",
                "bio": "Seeking a serious relationship and life partner",
                "location": "Los Angeles, CA"
            },
            {
                "email": "emma@test.com",
                "password": "password123", 
                "name": "Emma",
                "age": 27,
                "gender": "female",
                "bio": "Open to friendship and seeing where things go",
                "location": "Chicago, IL"
            }
        ]
        
        for user_data in test_users:
            try:
                response = self.session.post(f"{BACKEND_URL}/auth/register", json=user_data)
                
                if response.status_code == 200:
                    data = response.json()
                    self.users[user_data["name"]] = {
                        "user_data": user_data,
                        "token": data["access_token"],
                        "user_id": data["user_id"]
                    }
                    self.log_test(f"Register {user_data['name']}", True, f"User ID: {data['user_id']}")
                else:
                    self.log_test(f"Register {user_data['name']}", False, f"Status: {response.status_code}, Response: {response.text}")
                    
            except Exception as e:
                self.log_test(f"Register {user_data['name']}", False, f"Exception: {str(e)}")
                
    def test_auth_login(self):
        """Test user login"""
        print("\n=== Testing Authentication - Login ===")
        
        for name, user_info in self.users.items():
            try:
                login_data = {
                    "email": user_info["user_data"]["email"],
                    "password": user_info["user_data"]["password"]
                }
                
                response = self.session.post(f"{BACKEND_URL}/auth/login", json=login_data)
                
                if response.status_code == 200:
                    data = response.json()
                    # Update token in case it changed
                    self.users[name]["token"] = data["access_token"]
                    self.log_test(f"Login {name}", True, f"Token received")
                else:
                    self.log_test(f"Login {name}", False, f"Status: {response.status_code}, Response: {response.text}")
                    
            except Exception as e:
                self.log_test(f"Login {name}", False, f"Exception: {str(e)}")
                
    def test_auth_me(self):
        """Test get current user details"""
        print("\n=== Testing Authentication - Get Me ===")
        
        for name, user_info in self.users.items():
            try:
                headers = {"Authorization": f"Bearer {user_info['token']}"}
                response = self.session.get(f"{BACKEND_URL}/auth/me", headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    self.log_test(f"Get Me {name}", True, f"Name: {data.get('name')}, Email: {data.get('email')}")
                else:
                    self.log_test(f"Get Me {name}", False, f"Status: {response.status_code}, Response: {response.text}")
                    
            except Exception as e:
                self.log_test(f"Get Me {name}", False, f"Exception: {str(e)}")
                
    def test_questionnaire_get(self):
        """Test get questionnaire questions"""
        print("\n=== Testing Questionnaire - Get Questions ===")
        
        try:
            response = self.session.get(f"{BACKEND_URL}/questionnaire/questions")
            
            if response.status_code == 200:
                data = response.json()
                questions = data.get("questions", [])
                self.log_test("Get Questionnaire Questions", True, f"Retrieved {len(questions)} questions")
            else:
                self.log_test("Get Questionnaire Questions", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Get Questionnaire Questions", False, f"Exception: {str(e)}")
            
    def test_questionnaire_submit(self):
        """Test submit questionnaire responses"""
        print("\n=== Testing Questionnaire - Submit Responses ===")
        
        # Sample responses for each user
        user_responses = {
            "John": {
                "q1": "Dating",
                "q2": "Restaurant dinner", 
                "q3": ["Sports", "Traveling"],
                "q4": ["Humor", "Kindness"],
                "q5": "Regular calls",
                "q6": "Maybe",
                "q7": "Balanced",
                "q8": "Bachelor's"
            },
            "Sarah": {
                "q1": "Serious Relationship",
                "q2": "Coffee shop",
                "q3": ["Reading", "Cooking"],
                "q4": ["Intelligence", "Honesty"],
                "q5": "Texting all day",
                "q6": "Yes", 
                "q7": "Homebody",
                "q8": "Master's"
            },
            "Emma": {
                "q1": "Friendship",
                "q2": "Outdoor activity",
                "q3": ["Music", "Traveling"],
                "q4": ["Creativity", "Humor"],
                "q5": "Occasional messages",
                "q6": "No",
                "q7": "Social butterfly", 
                "q8": "Bachelor's"
            }
        }
        
        for name, user_info in self.users.items():
            try:
                headers = {"Authorization": f"Bearer {user_info['token']}"}
                responses_data = {"responses": user_responses.get(name, {})}
                
                response = self.session.post(f"{BACKEND_URL}/questionnaire/submit", 
                                           json=responses_data, headers=headers)
                
                if response.status_code == 200:
                    self.log_test(f"Submit Questionnaire {name}", True, "Questionnaire submitted successfully")
                else:
                    self.log_test(f"Submit Questionnaire {name}", False, f"Status: {response.status_code}, Response: {response.text}")
                    
            except Exception as e:
                self.log_test(f"Submit Questionnaire {name}", False, f"Exception: {str(e)}")
                
    def test_matching_find(self):
        """Test find matches"""
        print("\n=== Testing Matching - Find Matches ===")
        
        for name, user_info in self.users.items():
            try:
                headers = {"Authorization": f"Bearer {user_info['token']}"}
                response = self.session.post(f"{BACKEND_URL}/matches/find", headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    matches = data.get("matches", [])
                    self.log_test(f"Find Matches {name}", True, f"Found {len(matches)} potential matches")
                else:
                    self.log_test(f"Find Matches {name}", False, f"Status: {response.status_code}, Response: {response.text}")
                    
            except Exception as e:
                self.log_test(f"Find Matches {name}", False, f"Exception: {str(e)}")
                
    def test_matching_get(self):
        """Test get all matches"""
        print("\n=== Testing Matching - Get Matches ===")
        
        for name, user_info in self.users.items():
            try:
                headers = {"Authorization": f"Bearer {user_info['token']}"}
                response = self.session.get(f"{BACKEND_URL}/matches", headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    matches = data.get("matches", [])
                    self.log_test(f"Get Matches {name}", True, f"Retrieved {len(matches)} matches")
                else:
                    self.log_test(f"Get Matches {name}", False, f"Status: {response.status_code}, Response: {response.text}")
                    
            except Exception as e:
                self.log_test(f"Get Matches {name}", False, f"Exception: {str(e)}")
                
    def test_messaging_send(self):
        """Test send messages"""
        print("\n=== Testing Messaging - Send Messages ===")
        
        # Test John sending message to Sarah
        if "John" in self.users and "Sarah" in self.users:
            try:
                john_headers = {"Authorization": f"Bearer {self.users['John']['token']}"}
                message_data = {
                    "receiver_id": self.users["Sarah"]["user_id"],
                    "content": "Hi Sarah! I saw your profile and would love to get to know you better.",
                    "message_type": "text"
                }
                
                response = self.session.post(f"{BACKEND_URL}/messages/send", 
                                           json=message_data, headers=john_headers)
                
                if response.status_code == 200:
                    data = response.json()
                    self.log_test("Send Message John->Sarah", True, f"Message sent successfully")
                else:
                    self.log_test("Send Message John->Sarah", False, f"Status: {response.status_code}, Response: {response.text}")
                    
            except Exception as e:
                self.log_test("Send Message John->Sarah", False, f"Exception: {str(e)}")
                
        # Test Sarah replying to John
        if "Sarah" in self.users and "John" in self.users:
            try:
                sarah_headers = {"Authorization": f"Bearer {self.users['Sarah']['token']}"}
                message_data = {
                    "receiver_id": self.users["John"]["user_id"],
                    "content": "Hi John! Thanks for reaching out. I'd like to get to know you too!",
                    "message_type": "text"
                }
                
                response = self.session.post(f"{BACKEND_URL}/messages/send", 
                                           json=message_data, headers=sarah_headers)
                
                if response.status_code == 200:
                    self.log_test("Send Message Sarah->John", True, "Reply sent successfully")
                else:
                    self.log_test("Send Message Sarah->John", False, f"Status: {response.status_code}, Response: {response.text}")
                    
            except Exception as e:
                self.log_test("Send Message Sarah->John", False, f"Exception: {str(e)}")
                
    def test_conversations_get(self):
        """Test get conversations"""
        print("\n=== Testing Messaging - Get Conversations ===")
        
        for name, user_info in self.users.items():
            try:
                headers = {"Authorization": f"Bearer {user_info['token']}"}
                response = self.session.get(f"{BACKEND_URL}/conversations", headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    conversations = data.get("conversations", [])
                    self.log_test(f"Get Conversations {name}", True, f"Retrieved {len(conversations)} conversations")
                else:
                    self.log_test(f"Get Conversations {name}", False, f"Status: {response.status_code}, Response: {response.text}")
                    
            except Exception as e:
                self.log_test(f"Get Conversations {name}", False, f"Exception: {str(e)}")
                
    def test_messages_get(self):
        """Test get messages in conversation"""
        print("\n=== Testing Messaging - Get Messages ===")
        
        # First get John's conversations to find conversation ID
        if "John" in self.users:
            try:
                john_headers = {"Authorization": f"Bearer {self.users['John']['token']}"}
                response = self.session.get(f"{BACKEND_URL}/conversations", headers=john_headers)
                
                if response.status_code == 200:
                    data = response.json()
                    conversations = data.get("conversations", [])
                    
                    if conversations:
                        conversation_id = conversations[0]["_id"]
                        
                        # Get messages in this conversation
                        response = self.session.get(f"{BACKEND_URL}/messages/{conversation_id}", 
                                                  headers=john_headers)
                        
                        if response.status_code == 200:
                            data = response.json()
                            messages = data.get("messages", [])
                            self.log_test("Get Messages in Conversation", True, f"Retrieved {len(messages)} messages")
                        else:
                            self.log_test("Get Messages in Conversation", False, f"Status: {response.status_code}, Response: {response.text}")
                    else:
                        self.log_test("Get Messages in Conversation", False, "No conversations found")
                else:
                    self.log_test("Get Messages in Conversation", False, f"Failed to get conversations: {response.status_code}")
                    
            except Exception as e:
                self.log_test("Get Messages in Conversation", False, f"Exception: {str(e)}")
                
    def test_free_user_limits(self):
        """Test free user chat limits"""
        print("\n=== Testing Free User Limits ===")
        
        # Test John trying to message Emma (3rd person)
        if "John" in self.users and "Emma" in self.users:
            try:
                john_headers = {"Authorization": f"Bearer {self.users['John']['token']}"}
                message_data = {
                    "receiver_id": self.users["Emma"]["user_id"],
                    "content": "Hi Emma! Would love to chat with you too.",
                    "message_type": "text"
                }
                
                response = self.session.post(f"{BACKEND_URL}/messages/send", 
                                           json=message_data, headers=john_headers)
                
                if response.status_code == 403:
                    self.log_test("Free User Limit Enforcement", True, "Correctly blocked 3rd conversation")
                elif response.status_code == 200:
                    self.log_test("Free User Limit Enforcement", False, "Should have blocked 3rd conversation but didn't")
                else:
                    self.log_test("Free User Limit Enforcement", False, f"Unexpected status: {response.status_code}, Response: {response.text}")
                    
            except Exception as e:
                self.log_test("Free User Limit Enforcement", False, f"Exception: {str(e)}")
                
    def save_test_credentials(self):
        """Save test credentials to file"""
        print("\n=== Saving Test Credentials ===")
        
        credentials_content = "# Test Credentials for MeeturMate\n\n"
        
        for name, user_info in self.users.items():
            credentials_content += f"User {name}:\n"
            credentials_content += f"Email: {user_info['user_data']['email']}\n"
            credentials_content += f"Password: {user_info['user_data']['password']}\n"
            credentials_content += f"User ID: {user_info['user_id']}\n"
            credentials_content += f"Token: {user_info['token']}\n\n"
            
        try:
            with open("/app/memory/test_credentials.md", "w") as f:
                f.write(credentials_content)
            self.log_test("Save Test Credentials", True, "Credentials saved to /app/memory/test_credentials.md")
        except Exception as e:
            self.log_test("Save Test Credentials", False, f"Exception: {str(e)}")
            
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting MeeturMate Backend API Tests")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        # Run tests in logical order
        self.test_auth_register()
        self.test_auth_login()
        self.test_auth_me()
        self.test_questionnaire_get()
        self.test_questionnaire_submit()
        self.test_matching_find()
        self.test_matching_get()
        self.test_messaging_send()
        self.test_conversations_get()
        self.test_messages_get()
        self.test_free_user_limits()
        self.save_test_credentials()
        
        # Print summary
        print("\n" + "=" * 60)
        print("🏁 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if total - passed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['details']}")
                    
        return passed == total

if __name__ == "__main__":
    tester = MeeturMateAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)