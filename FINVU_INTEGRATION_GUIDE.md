# FINVU Account Aggregator Integration Guide

## 🎯 Overview

This guide covers the integration with FINVU Account Aggregator (AA) for Rudo Wealth Investment platform. FINVU provides secure access to customer financial data from various Financial Information Providers (FIPs) through India's Account Aggregator ecosystem.

---

## 🔐 Credentials Setup

All credentials are securely stored in Replit Secrets and loaded via environment variables.

### UAT Environment
- **FIU ID:** `fiu@rudowealth`
- **Base URL:** `https://rudowealth.fiu.finfactor.in/finsense/API/V2`
- **Channel ID:** `channel@rudowealth`
- **Channel Password:** *(stored in secrets)*
- **Admin ID:** `admin@rudowealth`
- **Admin Password:** *(stored in secrets)*
- **Dashboard:** https://webreact.fiu.finfactor.in/list-template

### PROD Environment
- **FIU ID:** `fiulive@rudowealth`
- **Base URL:** `https://rudowealth.fiulive.finfactor.co.in/finsense/API/V2`
- **Channel ID:** `channel@rudowealth`
- **Channel Password:** *(stored in secrets)*
- **Admin ID:** `admin@rudowealth`
- **Passphrase:** *(stored in secrets)*
- **Dashboard:** https://web.fiulive.finfactor.co.in/

---

## 🔧 Environment Configuration

The application supports switching between UAT and PROD environments via the `AA_ENVIRONMENT` variable.

### Current Configuration
```bash
AA_ENVIRONMENT=UAT  # Set to 'PROD' for production
```

### All Required Secrets (Already Configured)
```
✅ AA_FINVU_UAT_FIU_ID
✅ AA_FINVU_UAT_BASE_URL
✅ AA_FINVU_UAT_CHANNEL_ID
✅ AA_FINVU_UAT_CHANNEL_PASSWORD
✅ AA_FINVU_UAT_ADMIN_ID
✅ AA_FINVU_UAT_ADMIN_PASSWORD

✅ AA_FINVU_PROD_FIU_ID
✅ AA_FINVU_PROD_BASE_URL
✅ AA_FINVU_PROD_CHANNEL_ID
✅ AA_FINVU_PROD_CHANNEL_PASSWORD
✅ AA_FINVU_PROD_ADMIN_ID
✅ AA_FINVU_PROD_ADMIN_PASSWORD
✅ AA_FINVU_PROD_PASSPHRASE
```

---

## 📋 Consent Templates

### Available Templates
FINVU provides two consent templates for Rudo Wealth:

| Template Name | Purpose Code | Use Case |
|--------------|--------------|----------|
| **BANK_STATEMENT_PERIODIC_SEBI** | 102 | Securities and investment accounts |
| **BANK_STATEMENT_PERIODIC** | 102 | Bank accounts and deposits |

### When to Use Each Template

**BANK_STATEMENT_PERIODIC_SEBI (102)**
- Mutual funds via AMCs
- Demat accounts via brokers
- Securities holdings
- Investment portfolios

**BANK_STATEMENT_PERIODIC (102)**
- Savings/Current accounts
- Fixed Deposits (FDs)
- Recurring Deposits (RDs)
- Bank balances

---

## 🔄 Integration Workflow

### 1. Institution Discovery
```typescript
// Search for financial institutions
const institutions = await aaService.searchInstitutions('HDFC', 'bank');
```

### 2. Account Linking
```typescript
// Discover accounts at an institution
const accounts = await aaService.discoverAccounts({
  institutionId: 'HDFC',
  customerId: 'user@finvu'
});
```

### 3. Consent Creation
```typescript
const consent = await aaService.createConsent({
  userId: 'user@finvu',
  purpose: 'Wealth Management',
  dataRange: {
    from: new Date('2023-01-01'),
    to: new Date()
  },
  frequency: { unit: 'MONTHLY', value: 1 },
  dataLife: { unit: 'YEAR', value: 1 },
  fiTypes: ['DEPOSIT', 'MUTUAL_FUNDS', 'SECURITIES']
});
```

### 4. Data Fetching
```typescript
const financialData = await aaService.fetchFinancialData({
  consentId: consent.consentId,
  dateRange: {
    from: new Date('2023-01-01'),
    to: new Date()
  }
});
```

---

## 🧪 Testing Strategy

### Phase 1: UAT Environment Testing
- [x] Environment setup complete
- [ ] Test institution search API
- [ ] Test account discovery flow
- [ ] Test consent creation
- [ ] Test consent approval workflow
- [ ] Test FI data fetching
- [ ] Verify data decryption and parsing
- [ ] End-to-end integration test

### Phase 2: Production Migration
- [ ] Switch `AA_ENVIRONMENT=PROD`
- [ ] Test with real customer accounts
- [ ] Monitor API response times
- [ ] Implement error handling
- [ ] Set up webhook endpoints for callbacks
- [ ] Deploy to production

---

## 🔔 Webhook Endpoints (Required for Production)

FINVU will send notifications to these endpoints:

### 1. Consent Notification
```
POST /api/aa/consent/notification
```
Triggered when consent status changes (PENDING → ACTIVE, REVOKED, etc.)

### 2. FI Data Notification
```
POST /api/aa/fi/notification
```
Triggered when FI data is ready for download after an FI request.

**Action Required:** Implement these webhook handlers before production deployment.

---

## 📊 Data Flow Architecture

```
User → Rudo Wealth → FINVU AA → FIP (Bank/AMC/Broker)
                          ↓
                    Encrypted FI Data
                          ↓
                  Decrypt & Parse
                          ↓
              Store in Database (holdings, transactions)
                          ↓
            Display in Dashboard & Analytics
```

---

## 🔒 Security Considerations

### Current Implementation
- ✅ Credentials stored in Replit Secrets (encrypted)
- ✅ Environment-based configuration (UAT/PROD)
- ✅ API request signing ready (JWS)
- ⚠️ Mock mode fallback for development

### Production Requirements
- [ ] Implement full RSA/ECDSA private key signing
- [ ] Add webhook signature verification
- [ ] Implement consent notification handlers
- [ ] Add FI data decryption layer
- [ ] Set up audit logging for all AA transactions
- [ ] Add rate limiting on AA endpoints
- [ ] Implement retry logic with exponential backoff

---

## 📈 Performance Metrics Integration

Once real AA data is available, the following metrics will use actual data:

### Current (Synthetic Data)
- Portfolio historical valuations → **Generated from returns**
- Benchmark comparison → **Hardcoded 10.5% return**
- Volatility → **Synthetic monthly fluctuations**
- Sharpe Ratio → **Calculated from synthetic data**
- Max Drawdown → **Based on synthetic valuations**

### After AA Integration (Real Data)
- Portfolio historical valuations → **From transaction history + daily prices**
- Benchmark comparison → **Real index data (NIFTY 50/SENSEX)**
- Volatility → **Actual portfolio value changes**
- Sharpe Ratio → **Real risk-adjusted returns**
- Max Drawdown → **Historical peak-to-trough analysis**

Refer to `PRODUCTION_MIGRATION.md` for detailed migration steps.

---

## 🚀 Next Steps

### Immediate Actions
1. ✅ Configure environment variables
2. ✅ Store all credentials securely
3. ⏳ Test institution search with UAT
4. ⏳ Implement consent flow testing
5. ⏳ Test account linking with test accounts

### Before Production
1. Implement webhook endpoints
2. Add FI data decryption
3. Create async job processor for FI data
4. Set up monitoring and alerting
5. Load test with production traffic
6. Security audit

---

## 📞 Support Contacts

### FINVU Support
- **UAT Dashboard:** https://webreact.fiu.finfactor.in/list-template
- **PROD Dashboard:** https://web.fiulive.finfactor.co.in/
- **Documentation:** Contact FINVU team for API docs

### Rudo Wealth Team
- **Entity Name:** Rudo Wealth Investment
- **UAT FIU ID:** fiu@rudowealth
- **PROD FIU ID:** fiulive@rudowealth

---

## 🔍 Troubleshooting

### Common Issues

**Issue:** "Running in MOCK mode"
- **Cause:** Missing environment variables
- **Fix:** Verify all `AA_FINVU_*` secrets are set and `AA_ENVIRONMENT` is configured

**Issue:** "Failed to generate JWS signature"
- **Cause:** Invalid passphrase or key format
- **Fix:** Verify passphrase in secrets, check key format requirements

**Issue:** "Institution search returns empty"
- **Cause:** API credentials incorrect or mock mode
- **Fix:** Check FIU ID and base URL, ensure not in mock mode

**Issue:** "Consent creation fails"
- **Cause:** Invalid consent parameters or template
- **Fix:** Use correct purpose code (102) and valid consent template

---

## 📝 API Reference

### Institution Search
```typescript
GET /api/aa/institutions/search?query=HDFC&type=bank
```

### Account Discovery
```typescript
POST /api/aa/accounts/discover
{
  "institutionId": "HDFC",
  "customerId": "9999999999@finvu"
}
```

### Consent Creation
```typescript
POST /api/aa/consent/create
{
  "userId": "9999999999@finvu",
  "purpose": "Wealth Management",
  "templateCode": "BANK_STATEMENT_PERIODIC_SEBI",
  "purposeCode": 102,
  "fiTypes": ["MUTUAL_FUNDS", "SECURITIES"]
}
```

### FI Data Fetch
```typescript
POST /api/aa/fi/fetch
{
  "consentId": "consent-uuid",
  "dateRange": {
    "from": "2023-01-01",
    "to": "2024-12-31"
  }
}
```

---

## ✅ Integration Checklist

### Environment Setup
- [x] UAT credentials configured
- [x] PROD credentials configured
- [x] Environment switcher implemented
- [x] Secrets stored securely

### API Integration
- [ ] Institution search tested
- [ ] Account discovery tested
- [ ] Consent creation tested
- [ ] Consent approval flow tested
- [ ] FI data fetching tested
- [ ] Data parsing implemented

### Production Readiness
- [ ] Webhook endpoints implemented
- [ ] Data decryption working
- [ ] Error handling robust
- [ ] Monitoring in place
- [ ] Load testing complete
- [ ] Security audit passed

---

**Status:** ✅ Credentials configured | ⏳ Integration in progress | 📍 Currently in UAT mode
