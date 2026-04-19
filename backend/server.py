from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request
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
import asyncio
import json
import random as stdlib_random
import hashlib
import hmac
import string
import razorpay
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from bot_engine import get_bot_profiles, get_bot_by_id, generate_bot_reply, COUNTRY_AGENTS, generate_agent_greeting

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

# Razorpay client
RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)) if RAZORPAY_KEY_ID else None

# Subscription Plans
SUBSCRIPTION_PLANS = {
    "monthly": {"amount": 49900, "currency": "INR", "duration_days": 30, "label": "Monthly Premium"},
    "quarterly": {"amount": 129900, "currency": "INR", "duration_days": 90, "label": "Quarterly Premium"},
    "yearly": {"amount": 399900, "currency": "INR", "duration_days": 365, "label": "Yearly Premium"},
}

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
    except Exception:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

# Pydantic Models
class PrivacySettings(BaseModel):
    blur_photo: bool = False
    hide_online_status: bool = False
    anonymous_browsing: bool = False
    disappearing_messages: bool = False
    read_receipts: bool = True

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    age: int
    gender: str  # male, female, other
    bio: Optional[str] = ""
    location: Optional[str] = ""
    photo: Optional[str] = None  # base64 encoded
    orientation: Optional[str] = "straight"  # straight, gay, lesbian, bisexual, open
    connection_types: Optional[List[str]] = []  # friendship, dating, emotional, social, lifestyle
    interests: Optional[List[str]] = []  # travel, music, fitness, etc.

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserPreferences(BaseModel):
    gender_preference: List[str] = ["male", "female", "other"]
    age_range: List[int] = [18, 100]
    location_preference: Optional[str] = None

class SocialLinks(BaseModel):
    whatsapp: Optional[str] = None
    facebook: Optional[str] = None
    linkedin: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    photo: Optional[str] = None
    preferences: Optional[UserPreferences] = None
    social_links: Optional[SocialLinks] = None
    orientation: Optional[str] = None
    connection_types: Optional[List[str]] = None
    interests: Optional[List[str]] = None
    privacy_settings: Optional[PrivacySettings] = None

class QuestionnaireResponse(BaseModel):
    responses: Dict[str, Any]  # question_id: answer

class MessageSend(BaseModel):
    receiver_id: str
    content: str
    message_type: str = "text"  # text, image, location
    disappearing: bool = False

class MatchFilters(BaseModel):
    gender: Optional[List[str]] = None
    age_range: Optional[List[int]] = None
    location: Optional[str] = None
    country: Optional[str] = None
    connection_types: Optional[List[str]] = None
    orientation: Optional[str] = None

class SuperLikeRequest(BaseModel):
    target_user_id: str
    message: Optional[str] = None

# --- Razorpay Models ---
class CreateOrderRequest(BaseModel):
    plan: str  # monthly, quarterly, yearly

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan: str

# --- Verification Models ---
class VerificationSubmit(BaseModel):
    verification_type: str  # live_photo, kyc, id_verification
    selfie_base64: Optional[str] = None
    id_front_base64: Optional[str] = None
    id_back_base64: Optional[str] = None
    id_type: Optional[str] = None  # aadhaar, passport, drivers_license, national_id

# --- Referral Models ---
class ApplyReferralRequest(BaseModel):
    referral_code: str

# --- Gaming Models ---
class CreateGameRoomRequest(BaseModel):
    game_type: str  # trivia, emoji_guess, would_you_rather, truth_or_dare
    max_players: int = 4

class JoinGameRoomRequest(BaseModel):
    room_id: str

class SubmitAnswerRequest(BaseModel):
    room_id: str
    question_id: str = ""
    answer: str

class GameRoomActionRequest(BaseModel):
    room_id: str

# --- OTP / Email Verification Models ---
class SendOTPRequest(BaseModel):
    email: EmailStr

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str

# --- Helper: Generate unique referral code ---
def _generate_referral_code(name: str) -> str:
    prefix = ''.join(c for c in name.upper() if c.isalpha())[:4]
    suffix = ''.join(stdlib_random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"{prefix}{suffix}"

# --- Helper: Generate 6-digit OTP ---
def _generate_otp() -> str:
    return ''.join(stdlib_random.choices(string.digits, k=6))

# --- Helper: Send OTP email ---
async def _send_otp_email(email: str, otp: str):
    """Send OTP via SMTP. Falls back silently if SMTP not configured."""
    smtp_host = os.environ.get("SMTP_HOST", "")
    smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    smtp_user = os.environ.get("SMTP_USER", "")
    smtp_pass = os.environ.get("SMTP_PASS", "")
    from_email = os.environ.get("SMTP_FROM", smtp_user)

    if not smtp_host or not smtp_user:
        logger.info(f"SMTP not configured. OTP for {email}: {otp}")
        return  # Log OTP for dev/testing

    msg = MIMEMultipart()
    msg["From"] = from_email
    msg["To"] = email
    msg["Subject"] = "MeeturMate - Your Verification Code"
    body = f"""
    <html><body style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:20px;">
    <div style="text-align:center;margin-bottom:24px;">
        <h1 style="color:#FF5F6D;margin:0;">MeeturMate</h1>
        <p style="color:#666;">Swipe. Match. Connect.</p>
    </div>
    <div style="background:#f9f9f9;border-radius:12px;padding:24px;text-align:center;">
        <p style="color:#333;font-size:16px;">Your verification code is:</p>
        <h2 style="color:#FF5F6D;font-size:36px;letter-spacing:8px;margin:16px 0;">{otp}</h2>
        <p style="color:#999;font-size:13px;">This code expires in 10 minutes. Do not share it with anyone.</p>
    </div>
    </body></html>
    """
    msg.attach(MIMEText(body, "html"))

    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, lambda: _smtp_send(smtp_host, smtp_port, smtp_user, smtp_pass, from_email, email, msg))
    except Exception as e:
        logger.error(f"Failed to send OTP email to {email}: {e}")

def _smtp_send(host, port, user, password, from_addr, to_addr, msg):
    with smtplib.SMTP(host, port) as server:
        server.starttls()
        server.login(user, password)
        server.sendmail(from_addr, to_addr, msg.as_string())

# --- Helper: Check verification for access control ---
def require_verified(current_user: dict, feature: str = "this feature"):
    """Raise 403 if user is not verified. Premium users bypass."""
    if current_user.get("is_premium"):
        return
    if current_user.get("verification_status") != "verified" and not current_user.get("is_verified"):
        raise HTTPException(
            status_code=403,
            detail=f"Profile verification required to access {feature}. Verify your profile in Settings."
        )

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
    user_dict["is_verified"] = False
    user_dict["subscription_start"] = datetime.utcnow()
    user_dict["subscription_end"] = datetime.utcnow() + timedelta(days=30)  # 30-day trial
    user_dict["free_chat_count"] = 0
    user_dict["active_conversations"] = []
    user_dict["questionnaire_completed"] = False
    user_dict["last_active"] = datetime.utcnow()
    user_dict["super_likes_remaining"] = 5
    user_dict["super_likes_reset"] = datetime.utcnow() + timedelta(days=1)
    user_dict["coins"] = 0
    user_dict["referral_code"] = _generate_referral_code(user_data.name)
    user_dict["referred_by"] = None
    user_dict["referral_count"] = 0
    user_dict["verification_status"] = "unverified"  # unverified, pending, verified
    user_dict["verification_type"] = None
    user_dict["verification_submitted_at"] = None
    user_dict["email_verified"] = False
    user_dict["email_verified"] = False
    user_dict["privacy_settings"] = {
        "blur_photo": False,
        "hide_online_status": False,
        "anonymous_browsing": False,
        "disappearing_messages": False,
        "read_receipts": True,
    }
    if "orientation" not in user_dict:
        user_dict["orientation"] = "straight"
    if "connection_types" not in user_dict:
        user_dict["connection_types"] = []
    if "interests" not in user_dict:
        user_dict["interests"] = []
    user_dict["preferences"] = {
        "gender_preference": ["male", "female", "other"],
        "age_range": [18, 100],
        "location_preference": None
    }
    
    result = await db.users.insert_one(user_dict)
    user_id = str(result.inserted_id)

    # --- Proactive country agent greeting ---
    # Find the opposite-gender agent for the user's country/location
    try:
        user_location = (user_dict.get("location") or "").lower()
        user_gender = (user_dict.get("gender") or "").lower()
        target_gender = "female" if user_gender == "male" else "male"

        # Find matching country agent
        matched_agent = None
        for agent in COUNTRY_AGENTS:
            country_lower = agent["country"].lower()
            loc_lower = agent["location"].lower()
            if (agent["gender"] == target_gender and
                (country_lower in user_location or
                 loc_lower in user_location or
                 user_location in country_lower or
                 agent["country_code"].lower() in user_location)):
                matched_agent = agent
                break

        # Fallback: pick a random opposite-gender agent
        if not matched_agent:
            candidates = [a for a in COUNTRY_AGENTS if a["gender"] == target_gender]
            if candidates:
                matched_agent = stdlib_random.choice(candidates)

        if matched_agent:
            # Find or get the agent's DB user ID
            agent_user = await db.users.find_one({"bot_id": matched_agent["bot_id"]})
            if agent_user:
                greeting = await generate_agent_greeting(
                    matched_agent,
                    user_dict.get("name", "there"),
                    user_gender,
                )
                # Create the conversation and first message
                conversation = {
                    "participants": [str(agent_user["_id"]), user_id],
                    "created_at": datetime.utcnow(),
                    "last_message_at": datetime.utcnow(),
                    "is_bot_conversation": True,
                }
                conv_result = await db.conversations.insert_one(conversation)
                await db.messages.insert_one({
                    "conversation_id": str(conv_result.inserted_id),
                    "sender_id": str(agent_user["_id"]),
                    "content": greeting,
                    "timestamp": datetime.utcnow(),
                    "read": False,
                })
                logger.info(f"Country agent {matched_agent['name']} sent greeting to new user {user_id}")
    except Exception as e:
        logger.error(f"Failed to send agent greeting: {e}")

    # Create token
    access_token = create_access_token(data={"sub": user_id})
    
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

# --- OTP / Email Verification Routes ---
@api_router.post("/auth/send-otp")
async def send_otp(req: SendOTPRequest):
    """Send a 6-digit OTP to the given email address."""
    otp = _generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    # Upsert: one active OTP per email
    await db.otp_codes.update_one(
        {"email": req.email},
        {"$set": {"otp": otp, "expires_at": expires_at, "attempts": 0, "created_at": datetime.utcnow()}},
        upsert=True,
    )

    await _send_otp_email(req.email, otp)
    return {"message": "OTP sent to your email", "expires_in_seconds": 600}

@api_router.post("/auth/verify-otp")
async def verify_otp(req: VerifyOTPRequest):
    """Verify an OTP for the given email."""
    record = await db.otp_codes.find_one({"email": req.email})
    if not record:
        raise HTTPException(status_code=400, detail="No OTP found. Request a new one.")

    # Rate-limit: max 5 attempts
    if record.get("attempts", 0) >= 5:
        await db.otp_codes.delete_one({"email": req.email})
        raise HTTPException(status_code=429, detail="Too many attempts. Request a new OTP.")

    await db.otp_codes.update_one({"email": req.email}, {"$inc": {"attempts": 1}})

    if record["expires_at"] < datetime.utcnow():
        await db.otp_codes.delete_one({"email": req.email})
        raise HTTPException(status_code=400, detail="OTP expired. Request a new one.")

    if record["otp"] != req.otp.strip():
        raise HTTPException(status_code=400, detail="Invalid OTP")

    # Mark email as verified on the user
    await db.users.update_one(
        {"email": req.email},
        {"$set": {"email_verified": True}}
    )
    await db.otp_codes.delete_one({"email": req.email})

    return {"message": "Email verified successfully", "email_verified": True}

# --- Location auto-detect (IP-based) ---
@api_router.get("/auth/detect-location")
async def detect_location(request: Request):
    """Return approximate location from request IP using ip-api.com (free, no key)."""
    import httpx
    # Get real IP from X-Forwarded-For or client
    forwarded = request.headers.get("x-forwarded-for")
    client_ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "")
    # Skip local IPs
    if client_ip in ("127.0.0.1", "::1", "localhost", "") or client_ip.startswith("192.168.") or client_ip.startswith("10."):
        return {"city": "", "country": "", "country_code": "", "detected": False}
    try:
        async with httpx.AsyncClient(timeout=5) as client_h:
            resp = await client_h.get(f"http://ip-api.com/json/{client_ip}?fields=city,country,countryCode,lat,lon")
            data = resp.json()
            return {
                "city": data.get("city", ""),
                "country": data.get("country", ""),
                "country_code": data.get("countryCode", ""),
                "lat": data.get("lat"),
                "lon": data.get("lon"),
                "detected": True,
            }
    except Exception:
        return {"city": "", "country": "", "country_code": "", "detected": False}

# --- Country AI Agents endpoint ---
@api_router.get("/agents/country-agents")
async def get_country_agents():
    """Return all country-based AI chat agents."""
    return {"agents": COUNTRY_AGENTS}

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    # Update last_active timestamp
    await db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": {"last_active": datetime.utcnow()}}
    )
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
def calculate_match_score(user1_responses: dict, user2_responses: dict, user1: dict = None, user2: dict = None) -> int:
    """Calculate compatibility score between 0-100"""
    if not user1_responses or not user2_responses:
        base = 50
    else:
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
            base = 50
        else:
            base = min(100, int(score / total_questions * 10))
    
    # Bonus for shared connection types
    if user1 and user2:
        ct1 = set(user1.get("connection_types", []))
        ct2 = set(user2.get("connection_types", []))
        shared_ct = ct1 & ct2
        if shared_ct:
            base = min(100, base + len(shared_ct) * 3)
        
        # Bonus for shared interests
        int1 = set(user1.get("interests", []))
        int2 = set(user2.get("interests", []))
        shared_int = int1 & int2
        if shared_int:
            base = min(100, base + len(shared_int) * 2)
    
    return base

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
        if filters.connection_types:
            query["connection_types"] = {"$in": filters.connection_types}
    
    # Find potential matches (exclude password_hash)
    potential_matches = await db.users.find(query, {"password_hash": 0, "is_bot": 0, "bot_id": 0}).to_list(100)
    
    # Filter out users with anonymous_browsing who are hiding (keep bots visible)
    # Users browsing anonymously can still be discovered, but their profile is partially hidden
    
    # Batch fetch questionnaires for all potential matches
    user_ids = [str(u["_id"]) for u in potential_matches]
    questionnaires_cursor = db.questionnaires.find({"user_id": {"$in": user_ids}})
    questionnaires_map = {q["user_id"]: q async for q in questionnaires_cursor}
    
    # Batch fetch existing matches
    existing_matches_cursor = db.matches.find({
        "$or": [
            {"user1_id": current_user["_id"], "user2_id": {"$in": user_ids}},
            {"user1_id": {"$in": user_ids}, "user2_id": current_user["_id"]}
        ]
    })
    existing_matches_set = set()
    async for m in existing_matches_cursor:
        existing_matches_set.add((m["user1_id"], m["user2_id"]))
        existing_matches_set.add((m["user2_id"], m["user1_id"]))
    
    # Batch fetch super likes sent by current user
    super_likes_cursor = db.super_likes.find({
        "sender_id": current_user["_id"],
        "target_id": {"$in": user_ids}
    })
    super_liked_set = set()
    async for sl in super_likes_cursor:
        super_liked_set.add(sl["target_id"])
    
    # Calculate match scores
    matches = []
    new_match_docs = []
    for user in potential_matches:
        uid = str(user["_id"])
        user_questionnaire = questionnaires_map.get(uid)
        
        score = calculate_match_score(
            current_questionnaire.get("responses", {}) if current_questionnaire else {},
            user_questionnaire.get("responses", {}) if user_questionnaire else {},
            current_user,
            user
        )
        
        # Check if match already exists using the batch-fetched set
        if (current_user["_id"], uid) not in existing_matches_set and score >= 30:
            new_match_docs.append({
                "user1_id": current_user["_id"],
                "user2_id": uid,
                "match_score": score,
                "created_at": datetime.utcnow()
            })
        
        user["_id"] = uid
        user["match_score"] = score
        user["is_super_liked"] = uid in super_liked_set
        # Apply photo blur if user has it enabled
        privacy = user.get("privacy_settings", {})
        user["photo_blurred"] = privacy.get("blur_photo", False)
        matches.append(user)
    
    # Batch insert new matches
    if new_match_docs:
        await db.matches.insert_many(new_match_docs)
    
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
    
    # Batch fetch all other users
    other_user_ids = []
    match_scores = {}
    for match in matches:
        other_id = match["user2_id"] if match["user1_id"] == current_user["_id"] else match["user1_id"]
        other_user_ids.append(ObjectId(other_id))
        match_scores[other_id] = match["match_score"]
    
    if not other_user_ids:
        return {"matches": []}
    
    users_cursor = db.users.find({"_id": {"$in": other_user_ids}}, {"password_hash": 0, "is_bot": 0, "bot_id": 0})
    users_map = {str(u["_id"]): u async for u in users_cursor}
    
    match_list = []
    for match in matches:
        other_id = match["user2_id"] if match["user1_id"] == current_user["_id"] else match["user1_id"]
        other_user = users_map.get(other_id)
        if other_user:
            other_user["_id"] = str(other_user["_id"])
            other_user["match_score"] = match_scores.get(other_id, 0)
            match_list.append(other_user)
    
    return {"matches": match_list}

# Super Like Routes
@api_router.post("/super-like")
async def send_super_like(req: SuperLikeRequest, current_user: dict = Depends(get_current_user)):
    # Check remaining super likes
    remaining = current_user.get("super_likes_remaining", 0)
    reset_time = current_user.get("super_likes_reset")
    
    # Reset daily super likes if needed
    if reset_time and datetime.utcnow() > reset_time:
        remaining = 5 if current_user.get("is_premium") else 1
        await db.users.update_one(
            {"_id": ObjectId(current_user["_id"])},
            {"$set": {"super_likes_remaining": remaining, "super_likes_reset": datetime.utcnow() + timedelta(days=1)}}
        )
    
    if remaining <= 0:
        raise HTTPException(status_code=403, detail="No super likes remaining. Resets daily." if not current_user.get("is_premium") else "No super likes remaining. Resets in 24h.")
    
    # Check if already super liked
    existing = await db.super_likes.find_one({
        "sender_id": current_user["_id"],
        "target_id": req.target_user_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already super liked this person")
    
    # Create super like
    await db.super_likes.insert_one({
        "sender_id": current_user["_id"],
        "target_id": req.target_user_id,
        "message": req.message,
        "created_at": datetime.utcnow()
    })
    
    # Decrement remaining
    await db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$inc": {"super_likes_remaining": -1}}
    )
    
    return {"message": "Super like sent!", "remaining": remaining - 1}

@api_router.get("/super-likes/received")
async def get_received_super_likes(current_user: dict = Depends(get_current_user)):
    likes = await db.super_likes.find({"target_id": current_user["_id"]}).sort("created_at", -1).to_list(50)
    sender_ids = [ObjectId(sl["sender_id"]) for sl in likes]
    if not sender_ids:
        return {"super_likes": []}
    users_cursor = db.users.find({"_id": {"$in": sender_ids}}, {"name": 1, "age": 1, "photo": 1, "location": 1, "is_verified": 1})
    users_map = {str(u["_id"]): u async for u in users_cursor}
    result = []
    for sl in likes:
        sender = users_map.get(sl["sender_id"])
        if sender:
            result.append({
                "sender": {**{k: v for k, v in sender.items() if k != "_id"}, "_id": str(sender["_id"])},
                "message": sl.get("message"),
                "created_at": sl["created_at"].isoformat()
            })
    return {"super_likes": result}

# Privacy Settings
@api_router.put("/privacy/update")
async def update_privacy(settings: PrivacySettings, current_user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": {"privacy_settings": settings.dict()}}
    )
    updated = await db.users.find_one({"_id": ObjectId(current_user["_id"])})
    updated["_id"] = str(updated["_id"])
    updated.pop("password_hash", None)
    return updated

# Verify Profile (simple self-verification for now)
@api_router.post("/profile/verify")
async def verify_profile(current_user: dict = Depends(get_current_user)):
    # In a real app this would involve photo/ID verification
    # For now, mark as verified if they have a photo and completed questionnaire
    if not current_user.get("photo"):
        raise HTTPException(status_code=400, detail="Upload a profile photo to get verified")
    if not current_user.get("questionnaire_completed"):
        raise HTTPException(status_code=400, detail="Complete the questionnaire to get verified")
    
    await db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": {"is_verified": True}}
    )
    return {"message": "Profile verified!", "is_verified": True}

# Online status endpoint
@api_router.get("/users/{user_id}/status")
async def get_user_status(user_id: str, current_user: dict = Depends(get_current_user)):
    target = await db.users.find_one({"_id": ObjectId(user_id)})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    
    privacy = target.get("privacy_settings", {})
    if privacy.get("hide_online_status", False):
        return {"online": False, "last_active": None, "hidden": True}
    
    last_active = target.get("last_active")
    if last_active:
        diff = (datetime.utcnow() - last_active).total_seconds()
        is_online = diff < 300  # Online if active in last 5 minutes
    else:
        is_online = False
    
    return {
        "online": is_online,
        "last_active": last_active.isoformat() if last_active else None,
        "hidden": False
    }

# Chat Routes
@api_router.post("/messages/send")
async def send_message(message_data: MessageSend, current_user: dict = Depends(get_current_user)):
    # Unverified users can only send up to 5 messages per conversation
    if not current_user.get("is_verified") and not current_user.get("is_premium"):
        conv = await db.conversations.find_one({
            "participants": {"$all": [current_user["_id"], message_data.receiver_id]}
        })
        if conv:
            msg_count = await db.messages.count_documents({
                "conversation_id": str(conv["_id"]),
                "sender_id": current_user["_id"]
            })
            if msg_count >= 5:
                raise HTTPException(
                    status_code=403,
                    detail="Unverified users can only send 5 messages per conversation. Verify your profile for unlimited access."
                )

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
    # Check if either user has disappearing messages enabled
    sender_privacy = current_user.get("privacy_settings", {})
    is_disappearing = message_data.disappearing or sender_privacy.get("disappearing_messages", False)
    
    message = {
        "conversation_id": conversation_id,
        "sender_id": current_user["_id"],
        "receiver_id": message_data.receiver_id,
        "content": message_data.content,
        "message_type": message_data.message_type,
        "timestamp": datetime.utcnow(),
        "read": False,
        "disappearing": is_disappearing,
        "expires_at": datetime.utcnow() + timedelta(minutes=5) if is_disappearing else None,
    }
    
    await db.messages.insert_one(message)
    message["_id"] = str(message["_id"])
    
    # If receiver is a bot, trigger auto-reply in background
    receiver = await db.users.find_one({"_id": ObjectId(message_data.receiver_id)})
    if receiver and receiver.get("is_bot"):
        # Convert location messages to readable text for the bot
        bot_msg_text = message_data.content
        if message_data.message_type == "location":
            try:
                loc = json.loads(message_data.content)
                bot_msg_text = f"[User shared their location: {loc.get('lat', 0):.4f}, {loc.get('lng', 0):.4f}]"
            except Exception:
                bot_msg_text = "[User shared their location]"
        asyncio.create_task(
            _bot_auto_reply(receiver, current_user, bot_msg_text, conversation_id)
        )
    
    return message


async def _bot_auto_reply(bot_user: dict, sender_user: dict, user_message: str, conversation_id: str):
    """Background task: waits a realistic delay, then generates and saves a bot reply."""
    try:
        # Random delay to feel like a real person typing (2-6 seconds)
        await asyncio.sleep(stdlib_random.uniform(2, 6))

        bot_profile = get_bot_by_id(bot_user.get("bot_id", ""))
        if not bot_profile:
            return

        # Attach the MongoDB _id so the AI engine can identify bot messages in history
        bot_profile["_db_id"] = str(bot_user["_id"])

        # Fetch conversation history
        history = await db.messages.find(
            {"conversation_id": conversation_id}
        ).sort("timestamp", 1).to_list(50)

        reply_text = await generate_bot_reply(
            bot_profile=bot_profile,
            user_message=user_message,
            conversation_history=history,
            user_name=sender_user.get("name", "there"),
        )

        # Save bot's reply
        bot_message = {
            "conversation_id": conversation_id,
            "sender_id": str(bot_user["_id"]),
            "receiver_id": sender_user["_id"],
            "content": reply_text,
            "message_type": "text",
            "timestamp": datetime.utcnow(),
            "read": False,
        }
        await db.messages.insert_one(bot_message)

        # Update conversation preview
        await db.conversations.update_one(
            {"_id": ObjectId(conversation_id)},
            {"$set": {"last_message": reply_text, "updated_at": datetime.utcnow()}},
        )
    except Exception as e:
        logger.error(f"Bot auto-reply failed: {e}")

@api_router.get("/conversations")
async def get_conversations(current_user: dict = Depends(get_current_user)):
    conversations = await db.conversations.find({
        "participants": current_user["_id"]
    }).sort("updated_at", -1).to_list(100)
    
    if not conversations:
        return {"conversations": []}
    
    # Batch fetch all other users
    other_user_ids = []
    for conv in conversations:
        other_id = [p for p in conv["participants"] if p != current_user["_id"]][0]
        other_user_ids.append(ObjectId(other_id))
    
    users_cursor = db.users.find({"_id": {"$in": other_user_ids}}, {"name": 1, "photo": 1, "age": 1, "last_active": 1, "privacy_settings": 1, "is_verified": 1})
    users_map = {str(u["_id"]): u async for u in users_cursor}
    
    # Batch fetch unread counts using aggregation
    conv_ids = [str(conv["_id"]) for conv in conversations]
    unread_pipeline = [
        {"$match": {"conversation_id": {"$in": conv_ids}, "receiver_id": current_user["_id"], "read": False}},
        {"$group": {"_id": "$conversation_id", "count": {"$sum": 1}}}
    ]
    unread_cursor = db.messages.aggregate(unread_pipeline)
    unread_map = {doc["_id"]: doc["count"] async for doc in unread_cursor}
    
    now = datetime.utcnow()
    conv_list = []
    for conv in conversations:
        other_id = [p for p in conv["participants"] if p != current_user["_id"]][0]
        other_user = users_map.get(other_id)
        
        if other_user:
            privacy = other_user.get("privacy_settings", {})
            last_active = other_user.get("last_active")
            is_online = False
            if last_active and not privacy.get("hide_online_status", False):
                is_online = (now - last_active).total_seconds() < 300
            
            conv["_id"] = str(conv["_id"])
            conv["other_user"] = {
                "_id": str(other_user["_id"]),
                "name": other_user["name"],
                "photo": other_user.get("photo"),
                "age": other_user.get("age"),
                "is_online": is_online,
                "last_active": last_active.isoformat() if last_active and not privacy.get("hide_online_status", False) else None,
                "is_verified": other_user.get("is_verified", False),
            }
            conv["unread_count"] = unread_map.get(conv["_id"], 0)
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
    
    # Remove expired disappearing messages
    now = datetime.utcnow()
    expired_ids = []
    valid_messages = []
    for msg in messages:
        if msg.get("disappearing") and msg.get("expires_at") and msg["expires_at"] < now:
            expired_ids.append(msg["_id"])
        else:
            valid_messages.append(msg)
    
    # Clean up expired messages
    if expired_ids:
        await db.messages.delete_many({"_id": {"$in": expired_ids}})
    
    # Mark messages as read
    await db.messages.update_many(
        {"conversation_id": conversation_id, "receiver_id": current_user["_id"]},
        {"$set": {"read": True}}
    )
    
    for msg in valid_messages:
        msg["_id"] = str(msg["_id"])
    
    return {"messages": valid_messages}

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

# ========== RAZORPAY SUBSCRIPTION ROUTES ==========

@api_router.post("/subscription/create-order")
async def create_subscription_order(req: CreateOrderRequest, current_user: dict = Depends(get_current_user)):
    if not razorpay_client:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
    
    plan = SUBSCRIPTION_PLANS.get(req.plan)
    if not plan:
        raise HTTPException(status_code=400, detail="Invalid plan. Choose: monthly, quarterly, yearly")
    
    order_data = {
        "amount": plan["amount"],
        "currency": plan["currency"],
        "receipt": f"rcpt_{current_user['_id']}_{req.plan}_{int(datetime.utcnow().timestamp())}",
        "notes": {
            "user_id": current_user["_id"],
            "plan": req.plan,
        },
    }
    
    order = razorpay_client.order.create(data=order_data)
    
    # Store order in DB for verification
    await db.orders.insert_one({
        "order_id": order["id"],
        "user_id": current_user["_id"],
        "plan": req.plan,
        "amount": plan["amount"],
        "currency": plan["currency"],
        "status": "created",
        "created_at": datetime.utcnow(),
    })
    
    return {
        "order_id": order["id"],
        "amount": plan["amount"],
        "currency": plan["currency"],
        "key_id": RAZORPAY_KEY_ID,
        "plan_label": plan["label"],
    }

@api_router.post("/subscription/verify-payment")
async def verify_payment(req: VerifyPaymentRequest, current_user: dict = Depends(get_current_user)):
    if not razorpay_client:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
    
    # Verify signature
    try:
        razorpay_client.utility.verify_payment_signature({
            "razorpay_order_id": req.razorpay_order_id,
            "razorpay_payment_id": req.razorpay_payment_id,
            "razorpay_signature": req.razorpay_signature,
        })
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Payment verification failed")
    
    plan = SUBSCRIPTION_PLANS.get(req.plan)
    if not plan:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    now = datetime.utcnow()
    subscription_end = now + timedelta(days=plan["duration_days"])
    
    # Update user to premium
    await db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": {
            "is_premium": True,
            "subscription_start": now,
            "subscription_end": subscription_end,
            "subscription_plan": req.plan,
        }}
    )
    
    # Update order status
    await db.orders.update_one(
        {"order_id": req.razorpay_order_id},
        {"$set": {
            "status": "paid",
            "payment_id": req.razorpay_payment_id,
            "verified_at": now,
        }}
    )
    
    # Record payment history
    await db.payments.insert_one({
        "user_id": current_user["_id"],
        "order_id": req.razorpay_order_id,
        "payment_id": req.razorpay_payment_id,
        "plan": req.plan,
        "amount": plan["amount"],
        "currency": plan["currency"],
        "status": "success",
        "created_at": now,
    })
    
    return {
        "message": "Payment verified! You are now a Premium member.",
        "is_premium": True,
        "subscription_end": subscription_end.isoformat(),
        "plan": req.plan,
    }

@api_router.get("/subscription/plans")
async def get_subscription_plans():
    plans = []
    for key, plan in SUBSCRIPTION_PLANS.items():
        plans.append({
            "id": key,
            "label": plan["label"],
            "amount": plan["amount"],
            "currency": plan["currency"],
            "duration_days": plan["duration_days"],
            "price_display": f"₹{plan['amount'] // 100}",
        })
    return {"plans": plans}

@api_router.get("/subscription/status")
async def get_subscription_status(current_user: dict = Depends(get_current_user)):
    return {
        "is_premium": current_user.get("is_premium", False),
        "plan": current_user.get("subscription_plan"),
        "subscription_end": current_user.get("subscription_end").isoformat() if current_user.get("subscription_end") else None,
        "coins": current_user.get("coins", 0),
    }

# ========== PROFILE VERIFICATION ROUTES ==========

@api_router.post("/verification/submit")
async def submit_verification(req: VerificationSubmit, current_user: dict = Depends(get_current_user)):
    if current_user.get("verification_status") == "verified":
        raise HTTPException(status_code=400, detail="Profile already verified")
    
    if current_user.get("verification_status") == "pending":
        raise HTTPException(status_code=400, detail="Verification already submitted and pending review")
    
    # Validate based on type
    if req.verification_type == "live_photo":
        if not req.selfie_base64:
            raise HTTPException(status_code=400, detail="Selfie photo is required for live photo verification")
    elif req.verification_type in ("kyc", "id_verification"):
        if not req.id_front_base64:
            raise HTTPException(status_code=400, detail="ID front image is required")
        if not req.id_type:
            raise HTTPException(status_code=400, detail="ID type is required")
    else:
        raise HTTPException(status_code=400, detail="Invalid verification type. Use: live_photo, kyc, id_verification")
    
    # Store verification request
    verification_doc = {
        "user_id": current_user["_id"],
        "verification_type": req.verification_type,
        "id_type": req.id_type,
        "status": "pending",
        "submitted_at": datetime.utcnow(),
        "reviewed_at": None,
        "reviewer_notes": None,
    }
    
    # Store images separately (in production, upload to S3/blob storage)
    if req.selfie_base64:
        verification_doc["selfie_ref"] = f"selfie_{current_user['_id']}_{int(datetime.utcnow().timestamp())}"
    if req.id_front_base64:
        verification_doc["id_front_ref"] = f"id_front_{current_user['_id']}_{int(datetime.utcnow().timestamp())}"
    if req.id_back_base64:
        verification_doc["id_back_ref"] = f"id_back_{current_user['_id']}_{int(datetime.utcnow().timestamp())}"
    
    await db.verifications.insert_one(verification_doc)
    
    # Update user status to pending
    await db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": {
            "verification_status": "pending",
            "verification_type": req.verification_type,
            "verification_submitted_at": datetime.utcnow(),
        }}
    )
    
    # Auto-approve live photo verification (in production, use face-matching AI)
    if req.verification_type == "live_photo" and current_user.get("photo"):
        await db.users.update_one(
            {"_id": ObjectId(current_user["_id"])},
            {"$set": {"verification_status": "verified", "is_verified": True}}
        )
        await db.verifications.update_one(
            {"user_id": current_user["_id"], "status": "pending"},
            {"$set": {"status": "approved", "reviewed_at": datetime.utcnow(), "reviewer_notes": "Auto-approved: live photo"}}
        )
        return {"message": "Live photo verified! Your profile is now verified.", "status": "verified"}
    
    return {"message": "Verification submitted! We'll review it within 24 hours.", "status": "pending"}

@api_router.get("/verification/status")
async def get_verification_status(current_user: dict = Depends(get_current_user)):
    verification = await db.verifications.find_one(
        {"user_id": current_user["_id"]},
        sort=[("submitted_at", -1)]
    )
    return {
        "verification_status": current_user.get("verification_status", "unverified"),
        "is_verified": current_user.get("is_verified", False),
        "verification_type": current_user.get("verification_type"),
        "submitted_at": verification["submitted_at"].isoformat() if verification else None,
        "reviewed_at": verification["reviewed_at"].isoformat() if verification and verification.get("reviewed_at") else None,
    }

# ========== REFERRAL SYSTEM ROUTES ==========

@api_router.get("/referral/info")
async def get_referral_info(current_user: dict = Depends(get_current_user)):
    return {
        "referral_code": current_user.get("referral_code", ""),
        "referral_count": current_user.get("referral_count", 0),
        "coins": current_user.get("coins", 0),
        "referral_link": f"https://meeturmate.app/join?ref={current_user.get('referral_code', '')}",
    }

@api_router.post("/referral/apply")
async def apply_referral(req: ApplyReferralRequest, current_user: dict = Depends(get_current_user)):
    if current_user.get("referred_by"):
        raise HTTPException(status_code=400, detail="You have already used a referral code")
    
    code = req.referral_code.strip().upper()
    if code == current_user.get("referral_code", "").upper():
        raise HTTPException(status_code=400, detail="You cannot use your own referral code")
    
    # Find referrer
    referrer = await db.users.find_one({"referral_code": {"$regex": f"^{code}$", "$options": "i"}})
    if not referrer:
        raise HTTPException(status_code=404, detail="Invalid referral code")
    
    referrer_id = str(referrer["_id"])
    
    # Award coins to both users
    # Referred user gets 100 coins
    await db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": {"referred_by": referrer_id}, "$inc": {"coins": 100}}
    )
    
    # Referrer gets 100 coins + increment count
    await db.users.update_one(
        {"_id": ObjectId(referrer_id)},
        {"$inc": {"coins": 100, "referral_count": 1}}
    )
    
    # Log the referral
    await db.referrals.insert_one({
        "referrer_id": referrer_id,
        "referred_id": current_user["_id"],
        "code": code,
        "coins_awarded": 100,
        "created_at": datetime.utcnow(),
    })
    
    return {
        "message": "Referral code applied! You earned 100 coins!",
        "coins_earned": 100,
        "new_balance": current_user.get("coins", 0) + 100,
    }

@api_router.get("/referral/history")
async def get_referral_history(current_user: dict = Depends(get_current_user)):
    referrals = await db.referrals.find(
        {"referrer_id": current_user["_id"]}
    ).sort("created_at", -1).to_list(50)
    
    referred_ids = [ObjectId(r["referred_id"]) for r in referrals]
    if not referred_ids:
        return {"referrals": [], "total_coins_earned": 0}
    
    users_cursor = db.users.find({"_id": {"$in": referred_ids}}, {"name": 1, "photo": 1})
    users_map = {str(u["_id"]): u async for u in users_cursor}
    
    result = []
    total_coins = 0
    for r in referrals:
        user = users_map.get(r["referred_id"])
        total_coins += r.get("coins_awarded", 100)
        result.append({
            "user_name": user["name"] if user else "Unknown",
            "coins_awarded": r.get("coins_awarded", 100),
            "date": r["created_at"].isoformat(),
        })
    
    return {"referrals": result, "total_coins_earned": total_coins}

# ========== GAMING ZONE ROUTES ==========

GAME_TYPES = {
    "trivia": {
        "label": "Trivia Challenge",
        "description": "Answer fun trivia questions. Fastest correct answer wins!",
        "icon": "brain",
        "min_players": 2,
        "max_players": 8,
        "questions_per_round": 10,
    },
    "emoji_guess": {
        "label": "Emoji Guess",
        "description": "Guess the movie, song, or phrase from emojis!",
        "icon": "happy",
        "min_players": 2,
        "max_players": 6,
        "questions_per_round": 8,
    },
    "would_you_rather": {
        "label": "Would You Rather",
        "description": "Choose between two fun scenarios. See how others voted!",
        "icon": "swap-horizontal",
        "min_players": 2,
        "max_players": 10,
        "questions_per_round": 12,
    },
    "truth_or_dare": {
        "label": "Truth or Dare",
        "description": "The classic party game! Answer truthfully or take a dare.",
        "icon": "flame",
        "min_players": 2,
        "max_players": 8,
        "questions_per_round": 10,
    },
}

# Pre-defined game questions
GAME_QUESTIONS = {
    "trivia": [
        {"id": "t1", "question": "What planet is known as the Red Planet?", "options": ["Venus", "Mars", "Jupiter", "Saturn"], "answer": "Mars"},
        {"id": "t2", "question": "Who painted the Mona Lisa?", "options": ["Picasso", "Da Vinci", "Monet", "Van Gogh"], "answer": "Da Vinci"},
        {"id": "t3", "question": "What is the capital of Japan?", "options": ["Seoul", "Beijing", "Tokyo", "Bangkok"], "answer": "Tokyo"},
        {"id": "t4", "question": "Which element has the symbol 'Au'?", "options": ["Silver", "Gold", "Aluminum", "Argon"], "answer": "Gold"},
        {"id": "t5", "question": "How many continents are there?", "options": ["5", "6", "7", "8"], "answer": "7"},
        {"id": "t6", "question": "What year did the Titanic sink?", "options": ["1910", "1912", "1914", "1916"], "answer": "1912"},
        {"id": "t7", "question": "Which language has the most native speakers?", "options": ["English", "Hindi", "Mandarin", "Spanish"], "answer": "Mandarin"},
        {"id": "t8", "question": "What is the largest ocean?", "options": ["Atlantic", "Indian", "Arctic", "Pacific"], "answer": "Pacific"},
        {"id": "t9", "question": "Who wrote Romeo and Juliet?", "options": ["Dickens", "Shakespeare", "Austen", "Hemingway"], "answer": "Shakespeare"},
        {"id": "t10", "question": "What is the hardest natural substance?", "options": ["Gold", "Iron", "Diamond", "Platinum"], "answer": "Diamond"},
    ],
    "emoji_guess": [
        {"id": "e1", "question": "🦁👑", "options": ["The Lion King", "Madagascar", "Narnia", "Jungle Book"], "answer": "The Lion King"},
        {"id": "e2", "question": "🕷️🧑", "options": ["Ant-Man", "Spider-Man", "Batman", "Iron Man"], "answer": "Spider-Man"},
        {"id": "e3", "question": "❄️👸", "options": ["Snow White", "Frozen", "Ice Age", "Cinderella"], "answer": "Frozen"},
        {"id": "e4", "question": "🚢💔", "options": ["Titanic", "Pearl Harbor", "Dunkirk", "Cast Away"], "answer": "Titanic"},
        {"id": "e5", "question": "🧙‍♂️💍", "options": ["Harry Potter", "Lord of the Rings", "Narnia", "The Hobbit"], "answer": "Lord of the Rings"},
        {"id": "e6", "question": "🦈🌊", "options": ["Finding Nemo", "Jaws", "Moana", "Shark Tale"], "answer": "Jaws"},
        {"id": "e7", "question": "👻👻👻", "options": ["Ghostbusters", "Casper", "Paranormal", "The Ring"], "answer": "Ghostbusters"},
        {"id": "e8", "question": "🏎️💨", "options": ["Fast & Furious", "Cars", "Need for Speed", "Rush"], "answer": "Fast & Furious"},
    ],
    "would_you_rather": [
        {"id": "w1", "question": "Would you rather?", "options": ["Travel to the future", "Travel to the past"], "type": "poll"},
        {"id": "w2", "question": "Would you rather?", "options": ["Be able to fly", "Be invisible"], "type": "poll"},
        {"id": "w3", "question": "Would you rather?", "options": ["Live in the mountains", "Live by the beach"], "type": "poll"},
        {"id": "w4", "question": "Would you rather?", "options": ["Always be 10 min late", "Always be 20 min early"], "type": "poll"},
        {"id": "w5", "question": "Would you rather?", "options": ["Read minds", "See the future"], "type": "poll"},
        {"id": "w6", "question": "Would you rather?", "options": ["No internet for a month", "No phone for a month"], "type": "poll"},
        {"id": "w7", "question": "Would you rather?", "options": ["Speak all languages", "Play all instruments"], "type": "poll"},
        {"id": "w8", "question": "Would you rather?", "options": ["Be famous", "Be extremely wealthy"], "type": "poll"},
    ],
    "truth_or_dare": [
        {"id": "td1", "type": "truth", "question": "What's the most embarrassing thing you've done on a date?"},
        {"id": "td2", "type": "dare", "question": "Send a funny selfie to the group!"},
        {"id": "td3", "type": "truth", "question": "What's your biggest dating deal-breaker?"},
        {"id": "td4", "type": "dare", "question": "Do your best impression of a celebrity crush!"},
        {"id": "td5", "type": "truth", "question": "What's the cheesiest pickup line you've used?"},
        {"id": "td6", "type": "dare", "question": "Share the last meme you saved on your phone!"},
        {"id": "td7", "type": "truth", "question": "What's your guilty pleasure TV show?"},
        {"id": "td8", "type": "dare", "question": "Describe your ideal partner using only 3 emojis!"},
        {"id": "td9", "type": "truth", "question": "What's the longest you've been single?"},
        {"id": "td10", "type": "dare", "question": "Type your bio using only your elbows!"},
    ],
}

@api_router.get("/games/types")
async def get_game_types():
    return {"games": [{"id": k, **v} for k, v in GAME_TYPES.items()]}

@api_router.post("/games/create-room")
async def create_game_room(req: CreateGameRoomRequest, current_user: dict = Depends(get_current_user)):
    require_verified(current_user, "Gaming Zone")
    
    game_config = GAME_TYPES.get(req.game_type)
    if not game_config:
        raise HTTPException(status_code=400, detail="Invalid game type")
    
    max_p = min(req.max_players, game_config["max_players"])
    
    # Generate room code
    room_code = ''.join(stdlib_random.choices(string.ascii_uppercase + string.digits, k=6))
    
    # Pick questions
    questions = GAME_QUESTIONS.get(req.game_type, [])
    selected = stdlib_random.sample(questions, min(len(questions), game_config["questions_per_round"]))
    
    room = {
        "room_code": room_code,
        "game_type": req.game_type,
        "host_id": current_user["_id"],
        "players": [{
            "user_id": current_user["_id"],
            "username": current_user.get("name", "Player"),
            "photo": current_user.get("photo"),
            "score": 0,
            "joined_at": datetime.utcnow(),
        }],
        "max_players": max_p,
        "status": "waiting",  # waiting, playing, finished
        "questions": selected,
        "current_question_index": 0,
        "answers": {},  # {question_id: {user_id: answer}}
        "created_at": datetime.utcnow(),
        "started_at": None,
        "finished_at": None,
    }
    
    result = await db.game_rooms.insert_one(room)
    
    return {
        "room_id": str(result.inserted_id),
        "room_code": room_code,
        "game_type": req.game_type,
        "game_label": game_config["label"],
        "max_players": max_p,
    }

@api_router.post("/games/join-room")
async def join_game_room(req: JoinGameRoomRequest, current_user: dict = Depends(get_current_user)):
    require_verified(current_user, "Gaming Zone")
    
    room = await db.game_rooms.find_one({"room_code": req.room_id.upper()})
    if not room:
        # Try by ObjectId
        try:
            room = await db.game_rooms.find_one({"_id": ObjectId(req.room_id)})
        except Exception:
            pass
    
    if not room:
        raise HTTPException(status_code=404, detail="Game room not found")
    
    if room["status"] != "waiting":
        raise HTTPException(status_code=400, detail="Game has already started")
    
    if len(room["players"]) >= room["max_players"]:
        raise HTTPException(status_code=400, detail="Room is full")
    
    # Check if already in room
    if any(p["user_id"] == current_user["_id"] for p in room["players"]):
        return {"message": "Already in room", "room_id": str(room["_id"]), "room_code": room["room_code"]}
    
    player = {
        "user_id": current_user["_id"],
        "username": current_user.get("name", "Player"),
        "photo": current_user.get("photo"),
        "score": 0,
        "joined_at": datetime.utcnow(),
    }
    
    await db.game_rooms.update_one(
        {"_id": room["_id"]},
        {"$push": {"players": player}}
    )
    
    return {
        "room_id": str(room["_id"]),
        "room_code": room["room_code"],
        "game_type": room["game_type"],
        "players": len(room["players"]) + 1,
        "max_players": room["max_players"],
    }

@api_router.post("/games/start")
async def start_game(req: GameRoomActionRequest, current_user: dict = Depends(get_current_user)):
    room = await db.game_rooms.find_one({"_id": ObjectId(req.room_id)})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    if room["host_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Only the host can start the game")
    
    if len(room["players"]) < GAME_TYPES[room["game_type"]]["min_players"]:
        raise HTTPException(status_code=400, detail="Not enough players to start")
    
    await db.game_rooms.update_one(
        {"_id": room["_id"]},
        {"$set": {"status": "playing", "started_at": datetime.utcnow()}}
    )
    
    # Strip answers from questions before sending to players
    first_q = None
    if room["questions"]:
        first_q = {k: v for k, v in room["questions"][0].items() if k != "answer"}
    return {"message": "Game started!", "first_question": first_q}

@api_router.post("/games/answer")
async def submit_game_answer(req: SubmitAnswerRequest, current_user: dict = Depends(get_current_user)):
    room = await db.game_rooms.find_one({"_id": ObjectId(req.room_id)})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    if room["status"] != "playing":
        raise HTTPException(status_code=400, detail="Game is not active")
    
    # Determine question: use question_id if provided, else current_question_index
    current_idx = room.get("current_question_index", 0)
    if req.question_id:
        question = next((q for q in room["questions"] if q["id"] == req.question_id), None)
    else:
        question = room["questions"][current_idx] if current_idx < len(room["questions"]) else None
    
    if not question:
        raise HTTPException(status_code=400, detail="No active question")
    
    q_id = question["id"]
    
    # Record answer
    answer_key = f"answers.{q_id}.{current_user['_id']}"
    await db.game_rooms.update_one(
        {"_id": room["_id"]},
        {"$set": {answer_key: req.answer}}
    )
    
    # Check if answer is correct (for trivia and emoji_guess)
    is_correct = False
    correct_answer = question.get("answer")
    if correct_answer:
        is_correct = req.answer == correct_answer
        if is_correct:
            # Award points
            for i, p in enumerate(room["players"]):
                if p["user_id"] == current_user["_id"]:
                    await db.game_rooms.update_one(
                        {"_id": room["_id"]},
                        {"$inc": {f"players.{i}.score": 10}}
                    )
                    break
    
    # Check if all players answered, advance to next question
    all_answered = True
    room_fresh = await db.game_rooms.find_one({"_id": room["_id"]})
    answers_for_q = room_fresh.get("answers", {}).get(q_id, {})
    for p in room_fresh["players"]:
        if p["user_id"] not in answers_for_q:
            all_answered = False
            break
    
    next_question = None
    game_over = False
    if all_answered:
        next_idx = current_idx + 1
        if next_idx >= len(room["questions"]):
            # Game over
            await db.game_rooms.update_one(
                {"_id": room["_id"]},
                {"$set": {"status": "finished", "finished_at": datetime.utcnow(), "current_question_index": next_idx}}
            )
            game_over = True
        else:
            await db.game_rooms.update_one(
                {"_id": room["_id"]},
                {"$set": {"current_question_index": next_idx}}
            )
            nq = room["questions"][next_idx]
            next_question = {k: v for k, v in nq.items() if k != "answer"}
    
    return {
        "correct": is_correct,
        "correct_answer": correct_answer,
        "all_answered": all_answered,
        "next_question": next_question,
        "game_over": game_over,
    }

@api_router.get("/games/room/{room_id}")
async def get_game_room(room_id: str, current_user: dict = Depends(get_current_user)):
    room = await db.game_rooms.find_one({"_id": ObjectId(room_id)})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    room["_id"] = str(room["_id"])
    # Ensure current_question_index exists
    if "current_question_index" not in room:
        room["current_question_index"] = room.pop("current_question", 0)
    # Remove correct answers from questions if game is active
    if room["status"] == "playing":
        for q in room.get("questions", []):
            q.pop("answer", None)
    
    return room

@api_router.post("/games/end")
async def end_game(req: GameRoomActionRequest, current_user: dict = Depends(get_current_user)):
    room = await db.game_rooms.find_one({"_id": ObjectId(req.room_id)})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    if room["host_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Only the host can end the game")
    
    await db.game_rooms.update_one(
        {"_id": room["_id"]},
        {"$set": {"status": "finished", "finished_at": datetime.utcnow()}}
    )
    
    # Award coins to winner
    players = sorted(room["players"], key=lambda p: p["score"], reverse=True)
    if players and players[0]["score"] > 0:
        await db.users.update_one(
            {"_id": ObjectId(players[0]["user_id"]) if not isinstance(players[0]["user_id"], ObjectId) else players[0]["user_id"]},
            {"$inc": {"coins": 50}}
        )
    
    return {
        "message": "Game finished!",
        "leaderboard": [{"username": p.get("username", p.get("name", "Player")), "score": p["score"]} for p in players],
        "winner": players[0].get("username", players[0].get("name", "Player")) if players else None,
    }

@api_router.get("/games/active-rooms")
async def get_active_rooms(current_user: dict = Depends(get_current_user)):
    rooms = await db.game_rooms.find(
        {"status": "waiting"},
        {"questions": 0, "answers": 0}
    ).sort("created_at", -1).to_list(20)
    
    for room in rooms:
        room["_id"] = str(room["_id"])
        room["player_count"] = len(room.get("players", []))
    
    return {"rooms": rooms}

# ========== COINS BALANCE ==========

@api_router.get("/coins/balance")
async def get_coins_balance(current_user: dict = Depends(get_current_user)):
    return {
        "coins": current_user.get("coins", 0),
        "referral_count": current_user.get("referral_count", 0),
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


@app.on_event("startup")
async def seed_bot_profiles():
    """Seed bot profiles and country agents into the users collection on every startup (idempotent)."""
    # Seed original bot profiles
    for bot in get_bot_profiles():
        existing = await db.users.find_one({"bot_id": bot["bot_id"]})
        if not existing:
            user_doc = {
                "bot_id": bot["bot_id"],
                "name": bot["name"],
                "age": bot["age"],
                "gender": bot["gender"],
                "bio": bot["bio"],
                "location": bot["location"],
                "photo": bot["photo"],
                "is_bot": True,
                "is_premium": True,
                "is_verified": True,
                "email": f"{bot['bot_id']}@meeturmate.bot",
                "password_hash": "",
                "created_at": datetime.utcnow(),
                "last_active": datetime.utcnow(),
                "questionnaire_completed": True,
                "active_conversations": [],
                "free_chat_count": 0,
                "orientation": "straight",
                "connection_types": ["dating", "friendship"],
                "interests": ["travel", "music", "food"],
                "privacy_settings": {
                    "blur_photo": False,
                    "hide_online_status": False,
                    "anonymous_browsing": False,
                    "disappearing_messages": False,
                    "read_receipts": True,
                },
                "preferences": {
                    "gender_preference": ["male", "female", "other"],
                    "age_range": [18, 100],
                    "location_preference": None,
                },
            }
            result = await db.users.insert_one(user_doc)
            await db.questionnaires.insert_one({
                "user_id": str(result.inserted_id),
                "responses": bot["questionnaire_responses"],
                "completed_at": datetime.utcnow(),
            })
            logger.info(f"Seeded bot: {bot['name']} (id={result.inserted_id})")
        else:
            # Update profile data in case it changed
            await db.users.update_one(
                {"bot_id": bot["bot_id"]},
                {"$set": {
                    "name": bot["name"],
                    "age": bot["age"],
                    "bio": bot["bio"],
                    "location": bot["location"],
                    "photo": bot["photo"],
                    "is_bot": True,
                    "is_verified": True,
                    "last_active": datetime.utcnow(),
                    "orientation": "straight",
                    "connection_types": ["dating", "friendship"],
                    "interests": ["travel", "music", "food"],
                    "privacy_settings": {
                        "blur_photo": False,
                        "hide_online_status": False,
                        "anonymous_browsing": False,
                        "disappearing_messages": False,
                        "read_receipts": True,
                    },
                }},
            )

    # Seed country AI agents
    for agent in COUNTRY_AGENTS:
        existing = await db.users.find_one({"bot_id": agent["bot_id"]})
        if not existing:
            user_doc = {
                "bot_id": agent["bot_id"],
                "name": agent["name"],
                "age": agent["age"],
                "gender": agent["gender"],
                "bio": agent["bio"],
                "location": agent["location"],
                "photo": agent["photo"],
                "is_bot": True,
                "is_country_agent": True,
                "country": agent["country"],
                "country_code": agent["country_code"],
                "is_premium": True,
                "is_verified": True,
                "email": f"{agent['bot_id']}@meeturmate.bot",
                "password_hash": "",
                "created_at": datetime.utcnow(),
                "last_active": datetime.utcnow(),
                "questionnaire_completed": True,
                "active_conversations": [],
                "free_chat_count": 0,
                "orientation": "straight",
                "connection_types": ["dating", "friendship", "emotional"],
                "interests": agent.get("interests", ["travel", "music", "food"]),
                "privacy_settings": {
                    "blur_photo": False,
                    "hide_online_status": False,
                    "anonymous_browsing": False,
                    "disappearing_messages": False,
                    "read_receipts": True,
                },
                "preferences": {
                    "gender_preference": ["male", "female", "other"],
                    "age_range": [18, 100],
                    "location_preference": None,
                },
            }
            result = await db.users.insert_one(user_doc)
            await db.questionnaires.insert_one({
                "user_id": str(result.inserted_id),
                "responses": agent.get("questionnaire_responses", {}),
                "completed_at": datetime.utcnow(),
            })
            logger.info(f"Seeded country agent: {agent['name']} ({agent['country']}) (id={result.inserted_id})")
        else:
            await db.users.update_one(
                {"bot_id": agent["bot_id"]},
                {"$set": {
                    "name": agent["name"],
                    "age": agent["age"],
                    "bio": agent["bio"],
                    "location": agent["location"],
                    "photo": agent["photo"],
                    "is_bot": True,
                    "is_country_agent": True,
                    "country": agent["country"],
                    "country_code": agent["country_code"],
                    "is_verified": True,
                    "last_active": datetime.utcnow(),
                }},
            )


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
