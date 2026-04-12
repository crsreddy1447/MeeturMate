from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from passlib.context import CryptContext
import jwt
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        user["_id"] = str(user["_id"])
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

# Pydantic Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    age: int
    gender: str  # male, female, other
    bio: Optional[str] = ""
    location: Optional[str] = ""
    photo: Optional[str] = None  # base64 encoded

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserPreferences(BaseModel):
    gender_preference: List[str] = ["male", "female", "other"]
    age_range: List[int] = [18, 100]
    location_preference: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    photo: Optional[str] = None
    preferences: Optional[UserPreferences] = None

class QuestionnaireResponse(BaseModel):
    responses: Dict[str, Any]  # question_id: answer

class MessageSend(BaseModel):
    receiver_id: str
    content: str
    message_type: str = "text"  # text, image

class MatchFilters(BaseModel):
    gender: Optional[List[str]] = None
    age_range: Optional[List[int]] = None
    location: Optional[str] = None
    country: Optional[str] = None

# Auth Routes
@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_password = get_password_hash(user_data.password)
    user_dict = user_data.dict(exclude={"password"})
    user_dict["password_hash"] = hashed_password
    user_dict["created_at"] = datetime.utcnow()
    user_dict["is_premium"] = False
    user_dict["subscription_start"] = datetime.utcnow()
    user_dict["subscription_end"] = datetime.utcnow() + timedelta(days=30)  # 30-day trial
    user_dict["free_chat_count"] = 0
    user_dict["active_conversations"] = []
    user_dict["questionnaire_completed"] = False
    user_dict["preferences"] = {
        "gender_preference": ["male", "female", "other"],
        "age_range": [18, 100],
        "location_preference": None
    }
    
    result = await db.users.insert_one(user_dict)
    
    # Create token
    access_token = create_access_token(data={"sub": str(result.inserted_id)})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": str(result.inserted_id)
    }

@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    access_token = create_access_token(data={"sub": str(user["_id"])})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": str(user["_id"])
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    current_user.pop("password_hash", None)
    return current_user

# Profile Routes
@api_router.put("/profile/update")
async def update_profile(update_data: UserUpdate, current_user: dict = Depends(get_current_user)):
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    
    if update_dict:
        await db.users.update_one(
            {"_id": ObjectId(current_user["_id"])},
            {"$set": update_dict}
        )
    
    updated_user = await db.users.find_one({"_id": ObjectId(current_user["_id"])})
    updated_user["_id"] = str(updated_user["_id"])
    updated_user.pop("password_hash", None)
    
    return updated_user

# Questionnaire Routes
@api_router.get("/questionnaire/questions")
async def get_questionnaire():
    questions = [
        {"id": "q1", "question": "What are you looking for?", "type": "single", "options": ["Friendship", "Dating", "Serious Relationship", "Marriage"]},
        {"id": "q2", "question": "What's your ideal first date?", "type": "single", "options": ["Coffee shop", "Restaurant dinner", "Outdoor activity", "Movie night"]},
        {"id": "q3", "question": "How do you spend your free time?", "type": "multiple", "options": ["Reading", "Sports", "Traveling", "Gaming", "Cooking", "Music"]},
        {"id": "q4", "question": "What's important to you in a partner?", "type": "multiple", "options": ["Humor", "Intelligence", "Kindness", "Ambition", "Creativity", "Honesty"]},
        {"id": "q5", "question": "Your communication style?", "type": "single", "options": ["Texting all day", "Regular calls", "Occasional messages", "In-person meetings"]},
        {"id": "q6", "question": "Do you want children?", "type": "single", "options": ["Yes", "No", "Maybe", "Already have kids"]},
        {"id": "q7", "question": "Your lifestyle?", "type": "single", "options": ["Homebody", "Social butterfly", "Balanced", "Adventurous"]},
        {"id": "q8", "question": "What's your education level?", "type": "single", "options": ["High School", "Bachelor's", "Master's", "PhD", "Other"]}
    ]
    return {"questions": questions}

@api_router.post("/questionnaire/submit")
async def submit_questionnaire(response_data: QuestionnaireResponse, current_user: dict = Depends(get_current_user)):
    questionnaire = {
        "user_id": current_user["_id"],
        "responses": response_data.responses,
        "completed_at": datetime.utcnow()
    }
    
    await db.questionnaires.insert_one(questionnaire)
    await db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": {"questionnaire_completed": True}}
    )
    
    return {"message": "Questionnaire submitted successfully"}

# Matching Routes
def calculate_match_score(user1_responses: dict, user2_responses: dict) -> int:
    """Calculate compatibility score between 0-100"""
    if not user1_responses or not user2_responses:
        return 50
    
    score = 0
    total_questions = 0
    
    for q_id in user1_responses:
        if q_id in user2_responses:
            total_questions += 1
            ans1 = user1_responses[q_id]
            ans2 = user2_responses[q_id]
            
            if isinstance(ans1, list) and isinstance(ans2, list):
                # Multiple choice - check overlap
                overlap = set(ans1) & set(ans2)
                if overlap:
                    score += len(overlap) * 10
            elif ans1 == ans2:
                score += 20
    
    if total_questions == 0:
        return 50
    
    return min(100, int(score / total_questions * 10))

@api_router.post("/matches/find")
async def find_matches(filters: Optional[MatchFilters] = None, current_user: dict = Depends(get_current_user)):
    # Get current user's preferences and questionnaire
    prefs = current_user.get("preferences", {})
    current_questionnaire = await db.questionnaires.find_one({"user_id": current_user["_id"]})
    
    # Build query
    query = {
        "_id": {"$ne": ObjectId(current_user["_id"])},
        "gender": {"$in": prefs.get("gender_preference", ["male", "female", "other"])}
    }
    
    # Apply filters if provided
    if filters:
        if filters.gender:
            query["gender"] = {"$in": filters.gender}
        if filters.age_range:
            query["age"] = {"$gte": filters.age_range[0], "$lte": filters.age_range[1]}
        if filters.location:
            query["location"] = {"$regex": filters.location, "$options": "i"}
        if filters.country:
            query["location"] = {"$regex": filters.country, "$options": "i"}
    
    # Find potential matches
    potential_matches = await db.users.find(query).to_list(100)
    
    # Calculate match scores
    matches = []
    for user in potential_matches:
        user_questionnaire = await db.questionnaires.find_one({"user_id": str(user["_id"])})
        
        score = calculate_match_score(
            current_questionnaire.get("responses", {}) if current_questionnaire else {},
            user_questionnaire.get("responses", {}) if user_questionnaire else {}
        )
        
        # Check if match already exists
        existing_match = await db.matches.find_one({
            "$or": [
                {"user1_id": current_user["_id"], "user2_id": str(user["_id"])},
                {"user1_id": str(user["_id"]), "user2_id": current_user["_id"]}
            ]
        })
        
        if not existing_match and score >= 30:  # Minimum threshold
            match_doc = {
                "user1_id": current_user["_id"],
                "user2_id": str(user["_id"]),
                "match_score": score,
                "created_at": datetime.utcnow()
            }
            await db.matches.insert_one(match_doc)
        
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        user["match_score"] = score
        matches.append(user)
    
    # Sort by score
    matches.sort(key=lambda x: x["match_score"], reverse=True)
    
    return {"matches": matches[:20]}  # Return top 20

@api_router.get("/matches")
async def get_matches(current_user: dict = Depends(get_current_user)):
    # Get all matches for current user
    matches = await db.matches.find({
        "$or": [
            {"user1_id": current_user["_id"]},
            {"user2_id": current_user["_id"]}
        ]
    }).sort("match_score", -1).to_list(100)
    
    match_list = []
    for match in matches:
        other_user_id = match["user2_id"] if match["user1_id"] == current_user["_id"] else match["user1_id"]
        other_user = await db.users.find_one({"_id": ObjectId(other_user_id)})
        
        if other_user:
            other_user["_id"] = str(other_user["_id"])
            other_user.pop("password_hash", None)
            other_user["match_score"] = match["match_score"]
            match_list.append(other_user)
    
    return {"matches": match_list}

# Chat Routes
@api_router.post("/messages/send")
async def send_message(message_data: MessageSend, current_user: dict = Depends(get_current_user)):
    # Check if user can chat (free user limit)
    if not current_user.get("is_premium", False):
        active_convs = current_user.get("active_conversations", [])
        if message_data.receiver_id not in active_convs and len(active_convs) >= 2:
            raise HTTPException(
                status_code=403,
                detail="Free users can only chat with 2 people. Upgrade to premium for unlimited chats."
            )
    
    # Find or create conversation
    conversation = await db.conversations.find_one({
        "participants": {"$all": [current_user["_id"], message_data.receiver_id]}
    })
    
    if not conversation:
        conversation = {
            "participants": [current_user["_id"], message_data.receiver_id],
            "created_at": datetime.utcnow(),
            "last_message": message_data.content,
            "updated_at": datetime.utcnow()
        }
        result = await db.conversations.insert_one(conversation)
        conversation_id = str(result.inserted_id)
        
        # Update active conversations
        if not current_user.get("is_premium", False):
            await db.users.update_one(
                {"_id": ObjectId(current_user["_id"])},
                {"$addToSet": {"active_conversations": message_data.receiver_id}}
            )
    else:
        conversation_id = str(conversation["_id"])
        await db.conversations.update_one(
            {"_id": conversation["_id"]},
            {"$set": {"last_message": message_data.content, "updated_at": datetime.utcnow()}}
        )
    
    # Create message
    message = {
        "conversation_id": conversation_id,
        "sender_id": current_user["_id"],
        "receiver_id": message_data.receiver_id,
        "content": message_data.content,
        "message_type": message_data.message_type,
        "timestamp": datetime.utcnow(),
        "read": False
    }
    
    await db.messages.insert_one(message)
    message["_id"] = str(message["_id"])
    
    return message

@api_router.get("/conversations")
async def get_conversations(current_user: dict = Depends(get_current_user)):
    conversations = await db.conversations.find({
        "participants": current_user["_id"]
    }).sort("updated_at", -1).to_list(100)
    
    conv_list = []
    for conv in conversations:
        other_user_id = [p for p in conv["participants"] if p != current_user["_id"]][0]
        other_user = await db.users.find_one({"_id": ObjectId(other_user_id)})
        
        if other_user:
            conv["_id"] = str(conv["_id"])
            conv["other_user"] = {
                "_id": str(other_user["_id"]),
                "name": other_user["name"],
                "photo": other_user.get("photo"),
                "age": other_user.get("age")
            }
            
            # Get unread count
            unread_count = await db.messages.count_documents({
                "conversation_id": conv["_id"],
                "receiver_id": current_user["_id"],
                "read": False
            })
            conv["unread_count"] = unread_count
            
            conv_list.append(conv)
    
    return {"conversations": conv_list}

@api_router.get("/messages/{conversation_id}")
async def get_messages(conversation_id: str, current_user: dict = Depends(get_current_user)):
    # Verify user is part of conversation
    conversation = await db.conversations.find_one({"_id": ObjectId(conversation_id)})
    if not conversation or current_user["_id"] not in conversation["participants"]:
        raise HTTPException(status_code=403, detail="Not authorized to view this conversation")
    
    messages = await db.messages.find({
        "conversation_id": conversation_id
    }).sort("timestamp", 1).to_list(1000)
    
    # Mark messages as read
    await db.messages.update_many(
        {"conversation_id": conversation_id, "receiver_id": current_user["_id"]},
        {"$set": {"read": True}}
    )
    
    for msg in messages:
        msg["_id"] = str(msg["_id"])
    
    return {"messages": messages}

# Usage tracking
@api_router.get("/usage/stats")
async def get_usage_stats(current_user: dict = Depends(get_current_user)):
    # This would track daily usage - simplified version
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    usage = await db.usage_logs.find_one({
        "user_id": current_user["_id"],
        "date": today
    })
    
    if not usage:
        return {"hours_today": 0, "warning": False}
    
    hours = usage.get("total_hours", 0)
    return {
        "hours_today": hours,
        "warning": hours >= 5,
        "message": "You've been using the app for over 5 hours today. Consider taking a break!" if hours >= 5 else None
    }

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
