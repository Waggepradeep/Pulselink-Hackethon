# backend/services/bedrock_service.py

import os
import boto3
import json
import logging
from botocore.exceptions import ClientError
from dotenv import load_dotenv

# Load environment variables
load_dotenv(override=True)

logger = logging.getLogger(__name__)

class BedrockService:
    def __init__(self, region_name=None, model_id=None):
        self.region_name = region_name or os.getenv("AWS_DEFAULT_REGION", "us-east-1")
        self.model_id = model_id or os.getenv("BEDROCK_MODEL_ID", "us.anthropic.claude-haiku-4-5-20251001-v1:0")
        # Use default credentials chain for Bedrock
        try:
            self.client = boto3.client('bedrock-runtime', region_name=self.region_name)
        except Exception as e:
            logger.error(f"Failed to initialize Bedrock client: {e}")
            self.client = None

    def generate_outreach_message(self, donor_info: dict, state: str, language: str) -> str:
        """
        Generates a warm, WhatsApp-ready outreach message in the donor's language
        using AWS Bedrock Claude Haiku. Falls back to static template if API fails.
        """
        blood_group = donor_info.get('blood_group', 'compatible')
        gender = donor_info.get('gender', 'donor')
        user_id = donor_info.get('user_id', 'Donor')
        short_id = user_id[-6:] if len(user_id) > 6 else user_id

        prompt = (
            f"You are a coordinator for Blood Warriors, a non-profit organization helping Thalassemia patients. "
            f"Write a warm, respectful outreach message to a blood donor. "
            f"Here are the donor details:\n"
            f"- Donor Reference ID: {short_id}\n"
            f"- Gender: {gender}\n"
            f"- Blood Group: {blood_group}\n"
            f"- Current State: {state}\n"
            f"- Preferred Language: {language}\n\n"
            f"Requirements:\n"
            f"1. Write the message in {language} (use script of the language, not transliterated, except for English).\n"
            f"2. Keep the tone extremely warm, respectful, and polite.\n"
            f"3. Mention that there is an urgent blood requirement for a Thalassemia child who needs a regular transfusion.\n"
            f"4. The message must be WhatsApp-ready: short (within 3-4 sentences), actionable, and formatted nicely (you can use emojis and *bold* text for emphasis).\n"
            f"5. Do not include any placeholder text (like [Name] or [Phone]). Include a call to action asking them to reply to this message if they are available to donate.\n"
            f"6. Do not include any email headers, JSON wrapper, prefix or explanation. Output ONLY the raw message content."
        )

        # Build fallback templates in case Bedrock invocation fails
        fallback_templates = {
            "Kannada": f"ನಮಸ್ಕಾರ, ಬ್ಲಡ್ ವಾರಿಯರ್ಸ್‌ನಿಂದ ತುರ್ತು ಸಂದೇಶ. ಥಲಸ್ಸೀಮಿಯಾ ಪೀಡಿತ ಮಗುವಿಗೆ ತುರ್ತಾಗಿ *{blood_group}* ರಕ್ತದ ಅವಶ್ಯಕತೆ ಇದೆ. ದಯವಿಟ್ಟು ನಮಗೆ ಸಹಾಯ ಮಾಡಿ. ನೀವು ರಕ್ತದಾನ ಮಾಡಲು ಲಭ್ಯವಿದ್ದರೆ ದಯವಿಟ್ಟು ಈ ಸಂದೇಶಕ್ಕೆ ಪ್ರತಿಕ್ರಿಯಿಸಿ. ಧನ್ಯವಾದಗಳು!",
            "Tamil": f"வணக்கம், பிளட் வாரியர்ஸ் அமைப்பிலிருந்து அவசர செய்தி. தலசீமியா நோயால் பாதிக்கப்பட்ட ஒரு குழந்தைக்கு அவசரமாக *{blood_group}* இரத்தம் தேவைப்படுகிறது. நீங்கள் இரத்ததானம் செய்ய விரும்பினால் தயவுசெய்து இந்த செய்திக்கு பதிலளிக்கவும். நன்றி!",
            "Telugu": f"నమస్కారం, బ్లడ్ వారియర్స్ నుండి అత్యవసర సందేశం. తలసేమియా వ్యాధితో బాధపడుతున్న చిన్నారికి అత్యవసరంగా *{blood_group}* రక్తం అవసరం. మీరు రక్తదానం చేయడానికి సిద్ధంగా ఉంటే దయచేసి ఈ మెసేజ్‌కు రిప్లై ఇవ్వండి. ధన్యవాదాలు!",
            "Marathi": f"नमस्कार, ब्लड वॉरियर्स कडून तातडीचा संदेश. थॅलेसेमिया ग्रस्त मुलासाठी तातडीने *{blood_group}* रक्ताची आवश्यकता आहे. आपण रक्तदान करण्यास तयार असल्यास कृपया या संदेशाला उत्तर द्या. धन्यवाद!",
            "Hindi": f"नमस्ते, ब्लड वॉरियर्स की ओर से आवश्यक संदेश। एक थैलेसीमिया पीड़ित बच्चे को तत्काल *{blood_group}* रक्त की आवश्यकता है। यदि आप रक्तदान करने के लिए उपलब्ध हैं, तो कृपया इस संदेश का उत्तर दें। धन्यवाद!",
            "English": f"Hello, urgent message from Blood Warriors. A Thalassemia patient child needs an urgent transfusion of *{blood_group}* blood. If you are available to donate, please reply to this message. Thank you!"
        }
        
        fallback_msg = fallback_templates.get(language, fallback_templates["English"])

        if not self.client:
            logger.warning("Bedrock client is not initialized. Using local fallback template.")
            return fallback_msg

        try:
            body = json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 500,
                "temperature": 0.7,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": prompt
                            }
                        ]
                    }
                ]
            })

            response = self.client.invoke_model(
                modelId=self.model_id,
                contentType="application/json",
                accept="application/json",
                body=body
            )

            response_body = json.loads(response.get('body').read().decode('utf-8'))
            message = response_body['content'][0]['text'].strip()
            
            # Clean outer quotes if model added them
            if (message.startswith('"') and message.endswith('"')) or (message.startswith("'") and message.endswith("'")):
                message = message[1:-1].strip()
                
            return message

        except ClientError as e:
            logger.error(f"AWS Bedrock client error invoking model {self.model_id}: {e}")
            return fallback_msg
        except Exception as e:
            logger.error(f"Unexpected error invoking Bedrock model: {e}")
            return fallback_msg
