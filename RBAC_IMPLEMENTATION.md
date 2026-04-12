# Role-Based Access Control (RBAC) Implementation Guide

## Overview
This document summarizes the complete RBAC implementation for the Safe Cycling API using JWT and MongoDB.

---

## Step 1: Authentication & Authorization Middleware

Located in: `src/middleware/authMiddleware.js`

### `protect` Middleware
- Extracts JWT from `Authorization: Bearer <token>` header
- Verifies token using `JWT_SECRET`
- Fetches user from database and attaches to `req.user`
- Returns 401 if no token or token invalid

### `authorize(...roles)` Middleware
- Checks if `req.user.role` is in the allowed roles array
- Returns 403 Forbidden if role not authorized
- Returns 401 if `protect` middleware didn't run first

**Usage:**
```javascript
router.delete('/:id', protect, authorize('admin'), deleteUser);
router.post('/', protect, authorize('user', 'admin', 'organization'), createHazard);
```

---

## Step 2: JWT Generation with Role

Located in: `src/services/authService.js` - `loginUser()` function

**Updated payload:**
```javascript
const token = jwt.sign(
    { id: user._id, role: user.role },  // ← Role now included
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
);
```

---

## Step 3: Secured Routes - Access Matrix

### Users (`/api/users`)
```javascript
POST   /          → Public                  (createUser)
GET    /          → Admin only              (authorize('admin'))
GET    /:id       → Any logged-in user      (protect)
PUT    /:id       → Any logged-in user      (protect)
DELETE /:id       → Admin only              (authorize('admin'))
```

### Routes (`/api/routes`)
```javascript
GET    /          → Public
POST   /          → Admin, Organization     (authorize('admin', 'organization'))
PUT    /:id       → Admin, Organization     (authorize('admin', 'organization'))
DELETE /:id       → Admin only              (authorize('admin'))
```

### Hazards (`/api/hazards`)
```javascript
GET    /          → Public
GET    /:id       → Public
POST   /          → Any logged-in user      (authorize('user', 'admin', 'organization'))
PUT    /:id       → Admin, Organization     (authorize('admin', 'organization'))
DELETE /:id       → Admin only              (authorize('admin'))
```

### Reviews (`/api/reviews`)
```javascript
GET    /route/:routeId  → Public
POST   /                → User only          (authorize('user'))
PUT    /:id             → User, Admin        (authorize('user', 'admin')) + ownership check
POST   /:id/vote        → Any logged-in user (protect)
DELETE /:id             → Admin only         (authorize('admin'))
```

---

## Step 4: Resource-Based Ownership Logic

### Pattern: Owner OR Admin Bypass

**Example from `updateReview` controller:**
```javascript
// Fetch the resource to check who owns it
const review = await Review.findById(req.params.id);

// Allow if: (1) user is owner, OR (2) user is admin
if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ 
        success: false, 
        message: 'Forbidden: You can only update your own reviews' 
    });
}

// Proceed with update
const updated = await reviewService.updateReview(req.params.id, req.body);
```

**Example from `updateUser` controller:**
```javascript
// Allow if: (1) updating own profile, OR (2) user is admin
if (req.user._id.toString() !== req.params.id && req.user.role !== 'admin') {
    return res.status(403).json({ 
        success: false, 
        message: 'Forbidden: You can only update your own profile' 
    });
}

const updatedUser = await userService.updateUser(req.params.id, req.body);
```

### Pattern for Other Controllers
Apply the same pattern to other resources when needed:
1. Fetch the resource by ID
2. Check if `resource.owner._id.toString() === req.user._id.toString()`
3. Allow bypass if `req.user.role === 'admin'`
4. Return 403 if neither condition is true

---

## Testing the Implementation

### 1. Create a Test User
```bash
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "Test1234!",
    "cyclingStyle": "commuter"
  }'
```

### 2. Create an Admin User
```bash
# First create as regular user, then manually update role in MongoDB to 'admin'
```

### 3. Login to Get Token
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!"
  }'

# Response includes token and role in JWT payload
```

### 4. Call Protected Endpoint with Token
```bash
curl -X GET http://localhost:5000/api/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 5. Test Unauthorized Access
```bash
# Should return 403 if not admin
curl -X GET http://localhost:5000/api/users \
  -H "Authorization: Bearer USER_TOKEN"
# Expected: "Forbidden: This action requires one of these roles: admin"
```

---

## User Roles Reference

| Role | Permissions |
|------|------------|
| **user** | Can create hazard reports, post reviews, manage own profile |
| **admin** | Can delete anything, view all users, manage system |
| **organization** | Can create/update routes and hazard reports |

---

## Files Modified

1. **authMiddleware.js** - Added `authorize()` function
2. **authService.js** - Updated JWT to include `role`
3. **userRoutes.js** - Applied RBAC middleware
4. **routeRoutes.js** - Applied RBAC middleware
5. **hazardRoutes.js** - Applied RBAC middleware
6. **reviewRoutes.js** - Applied RBAC middleware
7. **reviewController.js** - Added ownership checks
8. **userController.js** - Updated ownership check logic

---

## Best Practices Applied

✅ Role included in JWT payload for stateless verification
✅ Authorization middleware separates concerns (auth vs authoring)
✅ Resource ownership checks prevent user-to-user data access
✅ Admin role bypasses ownership restrictions
✅ Consistent response format and status codes
✅ Descriptive error messages for debugging
✅ Scalable pattern for adding new resources/permissions
