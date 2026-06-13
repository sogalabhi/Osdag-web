# Chapter 3: Authentication & Security System

Osdag-Web delegates user identity management to **Firebase Authentication** on the client side, while verifying credentials and enforcing permission boundaries on the Django backend.

---

## 3.1 Firebase Auth Integration

### 1. Client-Side Authentication Lifecycle
The frontend utilizes the Firebase Web SDK to perform actions such as sign-up, login, social logins (Google, GitHub), and email verification.
* Authenticated states are tracked via the `onAuthStateChanged` observer in [AuthContext.jsx](../frontend/src/context/AuthContext.jsx).
* The user's JWT ID Token is fetched dynamically before sending any authenticated API requests. If a request returns `HTTP 401 Unauthorized`, an interceptor in [apiClient.js](../frontend/src/utils/apiClient.js) automatically triggers a forced token refresh and retries the request seamlessly.

### 2. Django Token Verification (`FirebaseAuthentication` Middleware)
All protected backend REST endpoints require authentication headers formatted as:
`Authorization: Bearer <firebase_jwt_id_token>`

The custom DRF authentication class [FirebaseAuthentication](../backend/apps/core/middleware/firebase_auth.py) processes this token:
1. **Token Extraction:** Reads the `HTTP_AUTHORIZATION` header.
2. **Signature Verification:** Decodes the token using the Firebase Admin SDK (`firebase_auth.verify_id_token(token)`). This verifies the token’s cryptographic signatures against Firebase's public keys.
3. **Identity Syncing:**
   * Uses the Firebase `uid` to find or create a standard Django `User` object (where `username = Firebase UID`).
   * Syncs the user's `email` to both the Django `User` and custom `UserAccount` models.
4. **Metadata Attachment:** Attaches the `firebase_uid` and `email_verified` (boolean flag) to the Django `request` object.

---

## 3.2 User Account Management & Email Verification

Osdag-Web prevents spam and unverified database writes by enforcing email checks before saving designs to the database.

### 1. The `IsEmailVerified` DRF Permission Gate
The [IsEmailVerified](../backend/apps/core/permissions.py) class validates that the request initiator is both authenticated and has a verified email:
```python
class IsEmailVerified(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # Checked via firebase_auth.verify_id_token claims
        return getattr(request, 'email_verified', False)
```

### 2. Action Blocking Rules
If a user is authenticated but has not clicked the email verification link:
* **Autosaving Projects:** Blocked with `HTTP 403 Forbidden` (`Please verify your email to create/save projects`).
* **Database OSI Saves:** Blocked at the `SaveOsiFromInputs` endpoint.

---

## 3.3 Guest Mode vs. Authenticated Mode

To encourage immediate engineering exploration, Osdag-Web implements a zero-barrier **Guest Mode**.

| Feature | Guest Mode | Authenticated (Verified) Mode |
|---------|------------|------------------------------|
| **Sign-In Required** | No (Anonymous sessions) | Yes (Firebase authenticated token) |
| **Project CRUD** | Disabled | Fully Enabled (saved in PostgreSQL) |
| **Calculations / CAD** | Fully Enabled (Celery) | Fully Enabled (Celery) |
| **OSI Save Format** | Client-side Base64 Download | Saved to DB (`OsiFile` model) & local download |
| **OSI Import** | File upload parsed in-memory | Project loaded from DB or direct upload |
| **Custom Materials** | Unavailable | Saved in `CustomMaterials` DB table |

---

## 3.4 Security Assessment & Scopes of Improvement

### 1. Performance Overhead of JWT Token Verification
* **The Problem:** In the current backend middleware setup, `firebase_auth.verify_id_token(token)` is executed on **every single incoming HTTP request**. While the Firebase Admin SDK internally caches public certificates, token decoding and cryptographic signature validation add unnecessary latency (~15–50ms) to every request.
* **Scope of Improvement:** Implement local JWT session token caching (e.g., using Redis). When a Firebase token is verified, store its signature, expiration, and UID in Redis. Subsequent requests can be checked against Redis in <1ms instead of executing full RSA signature verification.

### 2. Outgoing Network Reliability Dependency
* **The Problem:** If the server loses connection to the external internet or Firebase APIs (e.g., due to firewall blocks or public DNS failures), the Firebase Admin SDK cannot fetch verification public keys. This will cause all API requests to fail with `401 Unauthorized`.
* **Scope of Improvement:** Implement a fallback token validation mechanism or configure local proxy caching for certificates.

### 3. Logical Email Verification Bypasses
* **The Problem:** The `SaveOsiFromInputs` endpoint contains a logical path:
  ```python
  is_guest = not (hasattr(request, 'user') and request.user.is_authenticated)
  if is_guest or inline:
      # Return Base64 payload directly (no DB save)
  ```
  If an authenticated user with an *unverified* email submits a request with the `inline` flag set to `True`, the backend bypasses the `email_verified` block entirely and serves the Base64 data. While it does not write to the DB, it allows unverified authenticated accounts to use server-side resources for OSI conversion.
* **Scope of Improvement:** Require verified email for all paths when the request contains authorization headers (even if `inline` is requested).
