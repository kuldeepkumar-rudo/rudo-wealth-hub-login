# 🚨 CRITICAL: FINVU Authentication Blocker

**Status:** ⛔ **BLOCKING PRODUCTION**  
**Severity:** HIGH  
**Impact:** All FINVU API calls fail with 401 authentication error

---

## Problem Summary

The current JWS (JSON Web Signature) implementation uses **HS256 symmetric key signing** with a passphrase, but FINVU requires **RS256/ES256 asymmetric key signing** with an RSA or EC private key.

**Result:** Every real API call to FINVU is rejected with:
```json
{
  "errorCode": 401,
  "errorMsg": "Missing authentication credentials"
}
```

---

## Current Implementation (INCORRECT)

**File:** `server/services/accountAggregator.ts`  
**Method:** `generateJWSSignature()`

```typescript
private async generateJWSSignature(payload: any): Promise<string> {
  try {
    // ❌ INCORRECT: Using HS256 with passphrase string
    const secret = new TextEncoder().encode(this.config.passphrase);
    const jwt = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT', kid: this.config.kid })
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(secret);
    
    return jwt;
  } catch (error) {
    throw new Error(`JWS signature generation failed: ${error}`);
  }
}
```

**Why This Fails:**
- FINVU expects RSA/EC private key signature (RS256 or ES256)
- We're using HMAC-SHA256 with a shared secret (HS256)
- The `kid` (Key ID) should reference the private key, not channel credentials
- FINVU cannot verify our signatures because the algorithm is wrong

---

## Required Implementation (CORRECT)

### Step 1: Obtain Private Key from FINVU

Contact FINVU support to get:
- ✅ **RSA Private Key** (PEM format, 2048-bit or 4096-bit)
  - OR
- ✅ **EC Private Key** (PEM format, P-256, P-384, or P-521 curve)
- ✅ **Key ID (kid)** that FINVU associates with your public key
- ✅ **Algorithm** (RS256, RS384, RS512, ES256, ES384, or ES512)

### Step 2: Update Environment Variables

Add to secrets:
```bash
# For RSA keys
AA_FINVU_UAT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIE...your key...\n-----END RSA PRIVATE KEY-----"
AA_FINVU_UAT_KEY_ID="your-key-id"
AA_FINVU_UAT_ALGORITHM="RS256"

# For production
AA_FINVU_PROD_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
AA_FINVU_PROD_KEY_ID="your-prod-key-id"
AA_FINVU_PROD_ALGORITHM="RS256"
```

### Step 3: Fix JWS Signature Generation

Replace the `generateJWSSignature()` method:

```typescript
private async generateJWSSignature(payload: any): Promise<string> {
  try {
    // Import the private key from PEM format
    const privateKey = await importJWK(
      JSON.parse(this.config.privateKey), // Or use importPKCS8 for PEM
      this.config.algorithm
    );
    
    // Create JWS with correct algorithm and key
    const jwt = await new SignJWT(payload)
      .setProtectedHeader({ 
        alg: this.config.algorithm, // 'RS256' or 'ES256'
        typ: 'JWT', 
        kid: this.config.kid 
      })
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);
    
    return jwt;
  } catch (error) {
    throw new Error(`JWS signature generation failed: ${error}`);
  }
}
```

### Step 4: Update AAConfig Interface

```typescript
interface AAConfig {
  fiuId: string;
  apiBaseUrl: string;
  kid: string; // Key ID associated with your public key
  privateKey: string; // RSA/EC private key in PEM or JWK format
  algorithm: 'RS256' | 'RS384' | 'RS512' | 'ES256' | 'ES384' | 'ES512';
  clientApiKey?: string;
}
```

### Step 5: Update Service Initialization

```typescript
const config: AAConfig = {
  fiuId: fiuId || 'FIU_DEMO',
  apiBaseUrl: apiBaseUrl || 'https://aauat.finvu.in/API/V1',
  kid: process.env.AA_FINVU_UAT_KEY_ID || '',
  privateKey: process.env.AA_FINVU_UAT_PRIVATE_KEY || '',
  algorithm: (process.env.AA_FINVU_UAT_ALGORITHM || 'RS256') as any,
  clientApiKey: channelPassword,
};
```

---

## Testing After Fix

### 1. Disable Mock Mode
```bash
# Remove or set to false
AA_FORCE_MOCK=false
```

### 2. Test Institution Search
```bash
curl http://localhost:5000/api/account-aggregator/institutions?query=HDFC
```

### 3. Test Consent Creation
```bash
curl -X POST http://localhost:5000/api/account-aggregator/consent \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "demo-user",
    "purpose": "Testing",
    "fiTypes": ["DEPOSIT"],
    "dataFrom": "2024-01-01",
    "dataTo": "2024-12-31"
  }'
```

**Expected:** Should return consent with `consentHandle` and `consentId`, NOT 401 error

### 4. Monitor Logs
```bash
# Should see:
[AA Service] Initializing with Finvu AA integration
[AA Service] Environment: UAT
[AA Finvu] POST /Consent - Success: 200

# Should NOT see:
[AA Finvu] API Error: 401
```

---

## Workaround (Current)

Until the JWS signing is fixed:

1. ✅ **Mock mode enabled:** `AA_FORCE_MOCK=true`
2. ✅ **All endpoints work with mock data**
3. ✅ **Test page functional for UI testing**
4. ⛔ **No real FINVU integration possible**

---

## Impact on Features

| Feature | Mock Mode | After JWS Fix |
|---------|-----------|---------------|
| Institution Search | ✅ Local registry | ✅ FINVU live data |
| Consent Creation | ✅ Mock consent | ✅ Real FINVU consent |
| Consent Status | ✅ Mock status | ✅ Real-time sync |
| Account Discovery | ✅ Mock accounts | ✅ Real linked accounts |
| FI Data Fetch | ✅ Mock data | ✅ Encrypted FI data |
| Webhooks | ✅ Placeholder | ✅ Real notifications |

---

## Next Steps

1. **Immediate:** Contact FINVU support to request:
   - Private key file (RSA or EC)
   - Key ID for UAT and PROD
   - Confirmation of algorithm (RS256 recommended)

2. **Implementation:** Update JWS signing code (2-4 hours)

3. **Testing:** Verify all endpoints against FINVU UAT (1-2 hours)

4. **Documentation:** Update integration guide with working auth (30 minutes)

5. **Production:** Switch to PROD credentials and retest (1 hour)

---

## References

- **FINVU Documentation:** See `FINVU_INTEGRATION_GUIDE.md`
- **ReBIT AA Specs:** https://api.rebit.org.in/spec/aa
- **Jose Library (JWS):** https://github.com/panva/jose
- **Integration Status:** See `FINVU_INTEGRATION_STATUS.md`

---

**Created:** November 21, 2025  
**Priority:** P0 - Blocking Production  
**Owner:** Development Team  
**ETA for Fix:** Pending FINVU private key delivery
