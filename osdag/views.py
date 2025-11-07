from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from firebase_admin import auth as firebase_auth
import firebase_admin
from firebase_admin import credentials
from django.contrib.auth.models import User
# from django.contrib.auth import get_user_model
# from django.views.decorators.csrf import csrf_exempt

# import json
from django.http.response import JsonResponse
from rest_framework.decorators import api_view

# importing data
from .data.design_types import design_type_data, connections_data, shear_connection, moment_connection, b2b_splice, b2column, c2c_splice, base_plate, tension_member


# Create your views here.


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


if not firebase_admin._apps:
    cred = credentials.Certificate("./osdag_web/firebase-service-account.json")
    firebase_admin.initialize_app(cred)

class FirebaseLoginView(APIView):
    def post(self, request):
        token = request.data.get("token")
        if not token:
            return Response({"error": "No token provided"}, status=400)
        try:
            decoded = firebase_auth.verify_id_token(token)
            email = decoded.get("email")
            uid = decoded.get("uid")
            user, _ = User.objects.get_or_create(username=uid, defaults={"email": email})
            return Response(
                {"message": "Login successful", "email": email, "uid": uid},
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
# User = get_user_model()

# @csrf_exempt
# def firebase_login(request):
#     if request.method != "POST":
#         return JsonResponse({"error": "Invalid request method"}, status=400)

#     try:
#         data = json.loads(request.body)
#         id_token = data.get("token")

#         if not id_token:
#             return JsonResponse({"error": "Missing Firebase ID token"}, status=400)

#         # ✅ Verify token with Firebase
#         decoded_token = firebase_auth.verify_id_token(id_token)
#         uid = decoded_token["uid"]
#         email = decoded_token.get("email", "")
#         name = decoded_token.get("name", "")

#         # ✅ Create or get user in your DB
#         user, created = User.objects.get_or_create(
#             email=email,
#             defaults={"username": name or email.split("@")[0]},
#         )

#         return JsonResponse({
#             "message": "User authenticated successfully",
#             "email": email,
#             "uid": uid,
#             "user_created": created,
#         })

#     except firebase_auth.InvalidIdTokenError:
#         return JsonResponse({"error": "Invalid Firebase ID token"}, status=401)
#     except Exception as e:
#         return JsonResponse({"error": str(e)}, status=400)