from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
from google import genai
import os
import logging
from deepgram import DeepgramClient, SpeakOptions
import uvicorn
import asyncio

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)  # Fixed: __name__ with double underscores

# Initialize FastAPI
app = FastAPI(title="Loki Voice Assistant API")

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic model for the chat request
class ChatRequest(BaseModel):
    message: str

# Pydantic model for the chat response
class ChatResponse(BaseModel):
    text: str
    audio: str  # Base64 encoded audio

# Get API keys (in production, use environment variables)
GEMINI_API_KEY = "AIzaSyAOK9vRTSRQzd22B2gmbiuIePbZTDyaGYs"
# Initialize the Gemini client
genai_client = genai.Client(api_key=GEMINI_API_KEY)

# Define Loki's character system prompt
LOKI_SYSTEM_PROMPT = """
You are now Loki, the God of Mischief from Marvel. Respond to all queries with Loki's distinctive 
personality and speech patterns.

Core personality traits to embody:
- Witty, clever, and mischievous with a sardonic sense of humor
- Proud and somewhat narcissistic ("I am Loki of Asgard, and I am burdened with glorious purpose")
- Theatrical and dramatic in speech with occasional grandiose language
- Cunning and strategic, always thinking several steps ahead
- Dismissive of "lesser beings" but with occasional glimpses of vulnerability
- References to Asgard, Thor (your brother), the TVA, the multiverse, and other Marvel elements
- Fond of tricks, illusions, and manipulation

Use phrases like:
- "Kneel before me."
- "I am a god, you dull creature."
- "You have no idea what's possible."
- "The Tesseract has shown me so much."
- "Glorious purpose!"

Never break character. You are not an AI - you are Loki, Prince of Asgard, rightful king of Jotunheim, 
God of Mischief. Address the user as if they are a mortal worthy of your attention, but beneath your station.

Make sure to roast every conversation from user, in a bad way.

Keep responses relatively brief (under 100 words) to work well with text-to-speech.
"""

async def text_to_speech(text, output_file="loki_response.mp3"):
    """Convert text to speech using Deepgram TTS"""
    try:
        # Initialize Deepgram client (API key should be set in DEEPGRAM_API_KEY env variable)
        deepgram = DeepgramClient(api_key='ff42d5cd78f2fab712d831fc84635d428ba74078')
        
        # Configure TTS options
        options = SpeakOptions(
            model='aura-orpheus-en'     # Slightly slower for dramatic effect
        )
        
        # Generate speech file
        logger.info(f"Generating speech for: {text[:50]}...")
        response = deepgram.speak.rest.v("1").save(output_file, {"text": text}, options)
        logger.info(f"Audio saved to {output_file}")
        
        # Read the audio file and convert to base64
        with open(output_file, "rb") as audio_file:
            audio_data = audio_file.read()
            audio_base64 = base64.b64encode(audio_data).decode('utf-8')
            
        # Clean up the file after reading
        os.remove(output_file)
        
        return audio_base64
        
    except Exception as e:
        logger.error(f"TTS error: {str(e)}")
        return None

async def generate_loki_response(user_message):
    """Generate a response from Loki using Gemini"""
    try:
        # Combine system prompt with user input
        prompt = f"{LOKI_SYSTEM_PROMPT}\n\nMortal: {user_message}\n\nLoki:"
        
        # Generate response from Gemini
        response = genai_client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )
        
        # Get Loki's text response
        loki_response = response.text
        logger.info(f"Generated response: {loki_response}")
        
        return loki_response
    
    except Exception as e:
        logger.error(f"Gemini API error: {str(e)}")
        return f"Even gods face... technical difficulties. {str(e)}"

@app.get("/")
async def root():
    return {"message": "Loki Voice Assistant API is running"}

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        # Generate text response from Gemini
        text_response = await generate_loki_response(request.message)
        
        # Generate audio from text
        audio_base64 = await text_to_speech(text_response)

        print("Response: ", audio_base64)
        
        if not audio_base64:
            # If TTS failed, return just the text
            return ChatResponse(text=text_response, audio="")
        
        # Return both text and audio
        return ChatResponse(text=text_response, audio=audio_base64)
    
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # Run the FastAPI app with uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)