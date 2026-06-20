from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from apps.core.permissions import IsEmailVerified
from django.utils import timezone
from django.db import transaction, IntegrityError
from django.contrib.auth.models import User
from apps.core.models import UserAccount
from firebase_admin import auth as firebase_auth
import logging

logger = logging.getLogger(__name__)

class DeleteAccountAPIView(APIView):
    """
    Endpoint to soft-delete/disable a user account.
    Marks is_active=False on Django User, sets deletion_requested_at on UserAccount,
    and revokes Firebase refresh tokens immediately.
    """
    permission_classes = [IsAuthenticated, IsEmailVerified]

    def delete(self, request):
        user = request.user
        uid = user.username  # Firebase UID is stored as username

        try:
            with transaction.atomic():
                # Disable Django user
                user.is_active = False
                user.save()

                # Mark deletion timestamp on UserAccount
                try:
                    user_account = UserAccount.objects.get(user=user)
                except UserAccount.DoesNotExist:
                    # Fallback to get by username if user relation is missing
                    user_account = UserAccount.objects.get(username=uid)
                    user_account.user = user

                user_account.deletion_requested_at = timezone.now()
                user_account.save()

            # Revoke Firebase tokens immediately
            try:
                firebase_auth.revoke_refresh_tokens(uid)
                logger.info(f"Revoked Firebase refresh tokens for user UID: {uid}")
            except Exception as fe:
                logger.error(f"Error revoking Firebase refresh tokens for UID {uid}: {fe}")

            logger.info(f"User account marked for deletion: {user.email} (UID: {uid})")
            return Response({
                "success": True,
                "message": "Account marked for deletion. It will be permanently purged in 7 days."
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error requesting account deletion: {e}", exc_info=True)
            return Response({
                "success": False,
                "error": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class ReactivateAccountAPIView(APIView):
    """
    Public endpoint to reactivate a soft-deleted account.
    Validates the Firebase ID token and re-enables is_active=True,
    clearing the deletion timestamp.
    """
    authentication_classes = []  # Bypass standard Bearer token middleware
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get("token")
        if not token:
            return Response({"error": "No token provided"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Decode and verify Firebase ID token
            decoded = firebase_auth.verify_id_token(token)
            uid = decoded.get("uid")

            if not uid:
                return Response({"error": "Invalid token: missing UID"}, status=status.HTTP_400_BAD_REQUEST)

            try:
                with transaction.atomic():
                    # Retrieve the inactive Django user
                    user = User.objects.get(username=uid)
                    user.is_active = True
                    user.save()

                    # Clear the deletion request timestamp
                    try:
                        user_account = UserAccount.objects.get(user=user)
                    except UserAccount.DoesNotExist:
                        user_account = UserAccount.objects.get(username=uid)
                        user_account.user = user

                    user_account.deletion_requested_at = None
                    user_account.save()

                logger.info(f"User account reactivated successfully: {user.email} (UID: {uid})")
                return Response({
                    "success": True,
                    "message": "Account reactivated successfully. Welcome back!"
                }, status=status.HTTP_200_OK)

            except User.DoesNotExist:
                return Response({"error": "User account not found"}, status=status.HTTP_404_NOT_FOUND)

        except firebase_auth.InvalidIdTokenError as e:
            return Response({"error": "Invalid Firebase token"}, status=status.HTTP_400_BAD_REQUEST)
        except firebase_auth.ExpiredIdTokenError as e:
            return Response({"error": "Firebase token has expired"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Reactivation unexpected error: {e}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
