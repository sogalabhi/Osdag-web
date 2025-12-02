# firebase_config.py
import firebase_admin
from firebase_admin import credentials

cred = credentials.Certificate("osdag_web/firebase-service-account.json")
# Initialize only once
if not firebase_admin._apps:
    default_app = firebase_admin.initialize_app(cred)