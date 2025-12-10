from django.http.response import JsonResponse
from rest_framework.decorators import api_view
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from firebase_admin import auth as firebase_auth
import firebase_admin
from firebase_admin import credentials
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken
import os

# importing data
from .data.design_types import design_type_data, connections_data, shear_connection, moment_connection, b2b_splice, b2column, c2c_splice, base_plate, tension_member


# Create your views here.

# Initialize Firebase Admin SDK
# TODO: Move this to a better place (e.g., AppConfig ready method) and use environment variables for path
if not firebase_admin._apps:
    # Try to find the credential file
    # Prefer service account placed in backend/firebase-service-account.json
    repo_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))  # .../backend
    cred_candidates = [
        os.path.join(repo_root, "firebase-service-account.json"),
        os.path.join(repo_root, "config", "firebase-service-account.json"),
        "osdag_web/firebase-service-account.json",  # legacy location
    ]
    cred_path = next((p for p in cred_candidates if os.path.exists(p)), None)
    
    if cred_path and os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    else:
        print("Warning: Firebase credentials not found. Checked:")
        for p in cred_candidates:
            print(f" - {p}")


@api_view(['GET'])
def dashboard_view(request):
    user = request.user
    return Response({
        "message": f"Welcome {user.username}!",
        "email": user.email,
    })


class FirebaseLoginView(APIView):
    def post(self, request):
        token = request.data.get("token")
        if not token:
            return Response({"error": "No token provided"}, status=400)
        try:
            decoded = firebase_auth.verify_id_token(token)
            email = decoded.get("email")
            uid = decoded.get("uid")
            if not email:
                return Response({"error": "Email not found in token"}, status=status.HTTP_400_BAD_REQUEST)

            # ✅ AUTO-CREATE USER IF NOT EXISTS
            try:
                user = User.objects.get(email=email)
                created = False
            except User.DoesNotExist:
                user = User.objects.create(
                    email=email,
                    username=email.split("@")[0]
                )
                created = True
            print(f"User {email} logged in successfully.")

            # 3️⃣ Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            return Response(
                {"message": "Login successful", "email": email, "uid": uid, "created": created, "access": access_token,
                "refresh": str(refresh)},
                status=status.HTTP_200_OK,
            )
        except firebase_auth.InvalidIdTokenError:
            return Response({"error": "Invalid Firebase token"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def get_design_types(request):
    return JsonResponse({'result': design_type_data}, safe=False)


@api_view(['GET'])
def get_connections(request):
    return JsonResponse({'result': connections_data}, safe=False)


@api_view(['GET'])
def get_shear_connection(request):
    return JsonResponse({'result': shear_connection}, safe=False)


@api_view(['GET'])
def get_moment_connection(request):
    return JsonResponse({'result': moment_connection}, safe=False)


@api_view(['GET'])
def get_b2b_splice(request):
    return JsonResponse({'result': b2b_splice}, safe=False)


@api_view(['GET'])
def get_b2column(request):
    return JsonResponse({'result': b2column}, safe=False)


@api_view(['GET'])
def get_c2c_splice(request):
    return JsonResponse({'result': c2c_splice}, safe=False)


@api_view(['GET'])
def get_base_plate(request):
    return JsonResponse({'result': base_plate}, safe=False)


@api_view(['GET'])
def get_tension_member(request):
    return JsonResponse({'result': tension_member}, safe=False)

