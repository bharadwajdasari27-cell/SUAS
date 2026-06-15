# Security Specification & Threat Model (TDD)

## 1. Data Invariants

1. **User Identity Isolation**: A user's private data (`/users/{userId}/private/info`) belongs completely to them. Non-owner reads are blocked, unless the reader is a verified administrator.
2. **Strict Public Isolation**: Public fields like display name and roles are editable by the user themselves, but the `role` field remains immutable for normal users; only administrators can change role variables.
3. **Log Integrity**: Activity logs are write-only for clients on create (only valid events with accurate matching userId and server-generated logs can be written), and both edit/delete permissions are blocked globally (immutability).
4. **Authentication Verification Constraint**: All writes to public or private profile structures require a valid active authentication session matching the target document owner's identifier, avoiding unauthorized spoofing.
5. **No Self-Assigned Privileges**: Normal users cannot set their own role to 'admin' or 'moderator' when creating or updating their public profile; role must default to 'user' unless authorized by an existing admin document.

---

## 2. The "Dirty Dozen" Payloads

Here are twelve payloads designed to bypass rules, which MUST result in `PERMISSION_DENIED`:

### Payload 1: Self-Escalation during Registration
* **Path**: `/users/attacker_uid/public/profile`
* **Operation**: Create
* **Auth**: `uid: "attacker_uid", email_verified: true`
* **Vulnerability Target**: Try to register directly as an Admin.
```json
{
  "displayName": "Attacker",
  "role": "admin",
  "avatarColor": "#EF4444",
  "updatedAt": "request.time"
}
```

### Payload 2: Self-Escalation via Update
* **Path**: `/users/attacker_uid/public/profile`
* **Operation**: Update
* **Auth**: `uid: "attacker_uid", email_verified: true` (Existing record: `role: "user"`)
* **Vulnerability Target**: Elevating status to Moderator.
```json
{
  "displayName": "Attacker",
  "role": "moderator",
  "avatarColor": "#EF4444",
  "updatedAt": "request.time"
}
```

### Payload 3: Spoofing Owner ID
* **Path**: `/users/victim_uid/public/profile`
* **Operation**: Create/Update
* **Auth**: `uid: "attacker_uid", email_verified: true`
* **Vulnerability Target**: Modifying another user's display name.
```json
{
  "displayName": "Jacked Nickname",
  "role": "user",
  "avatarColor": "#4F46E5",
  "updatedAt": "request.time"
}
```

### Payload 4: Shadow Fields Insertion
* **Path**: `/users/attacker_uid/public/profile`
* **Operation**: Create
* **Auth**: `uid: "attacker_uid", email_verified: true`
* **Vulnerability Target**: Injecting unsolicited privileges through a ghost field.
```json
{
  "displayName": "Attacker UX",
  "role": "user",
  "avatarColor": "#4F46E5",
  "updatedAt": "request.time",
  "isSystemPremiumUser": true
}
```

### Payload 5: Tampering with Creation Dates
* **Path**: `/users/attacker_uid/private/info`
* **Operation**: Create
* **Auth**: `uid: "attacker_uid", email_verified: true`
* **Vulnerability Target**: Setting custom creation date in the past.
```json
{
  "email": "attacker@gmail.com",
  "createdAt": "2020-01-01T00:00:00Z",
  "lastLogin": "request.time",
  "providerId": "google.com"
}
```

### Payload 6: Reading Someone Else's PII
* **Path**: `/users/victim_uid/private/info`
* **Operation**: Read (Get)
* **Auth**: `uid: "attacker_uid", email_verified: true`
* **Vulnerability Target**: Accessing a stranger's email and billing coordinates.
```json
{}
```

### Payload 7: Private Email Mismatch Spoofing
* **Path**: `/users/attacker_uid/private/info`
* **Operation**: Create
* **Auth**: `uid: "attacker_uid", email: "attacker@gmail.com"`
* **Vulnerability Target**: Trying to complete registration with an email mismatching the authenticated token's email coordinate.
```json
{
  "email": "hijacked@gmail.com",
  "createdAt": "request.time",
  "lastLogin": "request.time",
  "providerId": "password"
}
```

### Payload 8: History Deletion by Malicious Actor
* **Path**: `/logs/any_log_id`
* **Operation**: Delete
* **Auth**: `uid: "attacker_uid"`
* **Vulnerability Target**: Clearing footprints/audit entries.
```json
{}
```

### Payload 9: Hijacking Log Author
* **Path**: `/logs/spoofed_log_id`
* **Operation**: Create
* **Auth**: `uid: "attacker_uid", email_verified: true`
* **Vulnerability Target**: Framing another user for a rogue event.
```json
{
  "userId": "victim_uid",
  "userEmail": "victim@gmail.com",
  "action": "ROLE_CHANGE",
  "details": "Escalated to admin role recursively",
  "timestamp": "request.time"
}
```

### Payload 10: Denying Client Query Constraints (Scraping Profiles)
* **Path**: `/users` (List)
* **Operation**: Read (List)
* **Auth**: `uid: "attacker_uid"`
* **Vulnerability Target**: Accessing whole users list with no query rules.
```json
{}
```

### Payload 11: System Resource Inflation ID Poisoning
* **Path**: `/users/very_long_non_conforming_id_over_128_characters_poison_attack_vector_junk/public/profile`
* **Operation**: Create
* **Auth**: `uid: "very_long_non_conforming_id_over_128_characters_poison_attack_vector_junk"`
* **Vulnerability Target**: Injecting immense string identifiers to deplete quota.
```json
{
  "displayName": "Malicious",
  "role": "user",
  "avatarColor": "#EF4444",
  "updatedAt": "request.time"
}
```

### Payload 12: Updating Immutable Field `createdAt`
* **Path**: `/users/attacker_uid/private/info`
* **Operation**: Update
* **Auth**: `uid: "attacker_uid"`
* **Vulnerability Target**: Modifying historical metadata during profile upgrades.
```json
{
  "email": "attacker@gmail.com",
  "createdAt": "2021-05-12T12:00:00Z",
  "lastLogin": "request.time",
  "providerId": "password"
}
```

---

## 3. Test Runner Concept (`/firestore.rules.test.ts`)

The accompanying code at `/firestore.rules.test.ts` acts as our formal security posture validator. It simulates each threat vector and verifies that the Firebase ruleset responds with strict `PERMISSION_DENIED` blocks.
