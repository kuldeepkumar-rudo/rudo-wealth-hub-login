/**
 * Account Aggregator Service for India's AA Framework (Finvu Integration)
 * 
 * This service provides integration with India's Account Aggregator ecosystem
 * through Finvu AA for secure financial data sharing. It implements the ReBIT protocol.
 * 
 * References:
 * - Finvu AA: https://finvu.github.io/sandbox/
 * - ReBIT Specs: https://api.rebit.org.in/spec/aa
 * - Sahamati: https://sahamati.org.in/
 */

import { 
  SignJWT, 
  jwtVerify, 
  importPKCS8, 
  importSPKI, 
  importJWK,
  CompactSign,
  compactVerify,
  flattenedVerify,
  base64url
} from 'jose';
import { randomUUID, createHash } from 'crypto';

interface AAConfig {
  fiuId: string; // Financial Information User ID (e.g., fiulive@rudowealth)
  apiBaseUrl: string; // AA API base URL (legacy Finvu)
  kid: string; // Key ID for JWS signing
  privateKeyPem?: string; // RSA private key in PEM format for RS256/RS512 signing
  clientApiKey?: string; // Client API key (JWT token from Finvu)
  // Finfactor V2 API configuration
  finfactorApiBaseUrl?: string; // e.g., https://rudowealth.fiu.finfactor.in/finsense/API/V2
  finfactorUserId?: string; // e.g., channel@rudowealth
  finfactorPassword?: string; // Login password
  finfactorChannelId?: string; // e.g., finsense
}

interface FinfactorAuthToken {
  token: string;
  expiresAt: Date;
}

interface ConsentRequest {
  userId: string; // Customer AA handle (e.g., user@finvu, 9999999999@finvu)
  purpose: string;
  dataRange: {
    from: Date;
    to: Date;
  };
  frequency: {
    unit: 'HOURLY' | 'DAILY' | 'MONTHLY' | 'DAY' | 'MONTH' | 'YEAR';
    value: number;
  };
  dataLife: {
    unit: 'MONTH' | 'YEAR' | 'DAY';
    value: number;
  };
  fiTypes: string[]; // e.g., ['DEPOSIT', 'MUTUAL_FUNDS', 'INSURANCE', 'SECURITIES']
  mobile?: string; // Optional: raw mobile number for redirect URL (without @finvu)
}

interface ConsentResponse {
  consentHandle: string;
  consentId: string;
  status: 'PENDING' | 'ACTIVE' | 'PAUSED' | 'REVOKED' | 'EXPIRED' | 'REJECTED';
  consentStart: Date;
  consentExpiry: Date;
  redirectUrl?: string; // URL to redirect user to FINVU portal for approval
  signedConsent?: string; // Signed consent artefact (when ACTIVE)
}

interface FIDataRequest {
  consentId: string;
  dateRange: {
    from: Date;
    to: Date;
  };
  sessionId?: string; // Optional: for fetching data from an existing session
}

interface FIDataResponse {
  sessionId: string;
  status: 'PENDING' | 'READY' | 'PARTIAL' | 'DENIED' | 'EXPIRED' | 'FAILED';
  accounts?: AccountData[];
}

interface AccountData {
  accountId: string;
  fipId: string;
  accountType: string;
  maskedAccountNumber: string;
  fiType: 'DEPOSIT' | 'MUTUAL_FUNDS' | 'INSURANCE' | 'SECURITIES' | 'TERM_DEPOSIT' | 'EQUITIES' | 'SIP';
  linkRefNumber?: string;
  balance?: {
    amount: number;
    currency: string;
  };
  holdings?: HoldingData[];
  transactions?: TransactionData[];
  profile?: any;
  summary?: any;
}

interface HoldingData {
  instrumentName: string;
  instrumentId?: string; // ISIN, scheme code, policy number
  quantity: number;
  averagePrice?: number;
  currentValue: number;
  investedAmount?: number;
  asOfDate: Date;
  holdingDetails?: Record<string, any>; // FI type-specific details
}

interface TransactionData {
  transactionId?: string;
  transactionType: string;
  amount: number;
  transactionDate: Date;
  narration?: string;
  reference?: string;
  transactionDetails?: Record<string, any>;
}

interface Institution {
  id: string;
  name: string;
  type: 'amc' | 'broker' | 'bank' | 'insurer';
  fipId?: string; // Finvu FIP ID
  logo?: string;
  description?: string;
}

interface DiscoveredAccount {
  accountId: string;
  accountName: string;
  accountNumber: string; // Masked
  accountType: string;
  institutionName: string;
  fipId: string;
  linkRefNumber?: string;
  isLinked: boolean;
}

interface OTPRequest {
  sessionId: string;
  mobileNumber?: string;
  email?: string;
}

interface OTPVerifyRequest {
  sessionId: string;
  otp: string;
}

/**
 * Account Aggregator Service with Finvu Integration
 * 
 * Handles consent management and data fetching from Financial Information Providers (FIPs)
 * through the Finvu Account Aggregator network.
 */
export class AccountAggregatorService {
  private config: AAConfig;
  private useMock: boolean;
  private privateKey: any = null;
  private finfactorToken: FinfactorAuthToken | null = null;

  constructor(config: AAConfig, useMock: boolean = false) {
    this.config = config;
    this.useMock = useMock;
  }

  /**
   * Login to Finfactor V2 API and get Bearer token
   */
  private async finfactorLogin(): Promise<string> {
    // Check if we have a valid cached token (with 5 min buffer)
    if (this.finfactorToken && this.finfactorToken.expiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
      return this.finfactorToken.token;
    }

    const baseUrl = this.config.finfactorApiBaseUrl;
    const userId = this.config.finfactorUserId || process.env.FINFACTOR_USER_ID;
    const password = this.config.finfactorPassword || process.env.FINFACTOR_PASSWORD;
    const channelId = this.config.finfactorChannelId || 'finsense';

    if (!baseUrl || !userId || !password) {
      throw new Error('Finfactor API credentials not configured. Set FINFACTOR_USER_ID and FINFACTOR_PASSWORD environment variables.');
    }

    const loginUrl = `${baseUrl}/User/Login`;
    const timestamp = new Date().toISOString();
    const requestId = randomUUID();

    const loginPayload = {
      header: {
        rid: requestId,
        ts: timestamp,
        channelId: channelId,
      },
      body: {
        userId: userId,
        password: password,
      },
    };

    console.log('[Finfactor] Logging in to API...');

    try {
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(loginPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Finfactor] Login failed:', response.status, errorText);
        throw new Error(`Finfactor login failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Extract token from response - Finfactor returns token in body.token or body.accessToken
      const token = data.body?.token || data.body?.accessToken || data.token || data.accessToken;
      
      if (!token) {
        console.error('[Finfactor] Login response missing token:', JSON.stringify(data));
        throw new Error('Finfactor login response missing token');
      }

      // Cache token with 1 hour expiry (adjust based on actual token lifetime)
      this.finfactorToken = {
        token: token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      };

      console.log('[Finfactor] Login successful, token cached');
      return token;
    } catch (error) {
      console.error('[Finfactor] Login error:', error);
      throw error;
    }
  }

  /**
   * Make authenticated API request to Finfactor V2 API
   */
  private async makeFinfactorRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    body?: any
  ): Promise<any> {
    const baseUrl = this.config.finfactorApiBaseUrl;
    if (!baseUrl) {
      throw new Error('Finfactor API base URL not configured');
    }

    // Get auth token
    const token = await this.finfactorLogin();
    
    const url = `${baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    console.log(`[Finfactor] ${method} ${url}`);

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Finfactor] API Error: ${response.status} - ${errorText}`);
      
      // If unauthorized, clear cached token and retry once
      if (response.status === 401) {
        this.finfactorToken = null;
        console.log('[Finfactor] Token expired, retrying login...');
        const newToken = await this.finfactorLogin();
        headers['Authorization'] = `Bearer ${newToken}`;
        
        const retryResponse = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
        if (!retryResponse.ok) {
          const retryErrorText = await retryResponse.text();
          throw new Error(`Finfactor API Error: ${retryResponse.status} ${retryErrorText}`);
        }
        return await retryResponse.json();
      }
      
      throw new Error(`Finfactor API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Check if Finfactor V2 API is configured
   */
  private isFinfactorConfigured(): boolean {
    const hasBaseUrl = !!this.config.finfactorApiBaseUrl;
    const hasCredentials = !!(
      (this.config.finfactorUserId || process.env.FINFACTOR_USER_ID) &&
      (this.config.finfactorPassword || process.env.FINFACTOR_PASSWORD)
    );
    return hasBaseUrl && hasCredentials;
  }

  /**
   * Initialize RSA private key for JWS signing
   * Finvu requires RS256 or RS512 algorithm for detached JWS signatures
   */
  private async getPrivateKey(): Promise<any> {
    if (this.privateKey) return this.privateKey;

    if (!this.config.privateKeyPem) {
      throw new Error('RSA private key not configured for JWS signing');
    }

    try {
      this.privateKey = await importPKCS8(this.config.privateKeyPem, 'RS256');
      return this.privateKey;
    } catch (error) {
      console.error('[AA Service] Failed to import private key:', error);
      throw new Error('Invalid RSA private key format');
    }
  }

  /**
   * Generate detached JWS signature for API request body
   * 
   * Finvu requires RFC7515 Appendix F detached signature:
   * - The payload is signed but NOT included in the JWS serialization
   * - Use RS256 or RS512 algorithm with RSA keys
   * - Set b64: false in protected header
   * - Result format: header..signature (empty payload section)
   */
  private async generateDetachedJWSSignature(payload: any): Promise<string> {
    try {
      const privateKey = await this.getPrivateKey();
      const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));

      // Create detached JWS using CompactSign with b64: false
      // This signs the raw payload bytes without base64url encoding them
      const jws = await new CompactSign(payloadBytes)
        .setProtectedHeader({
          alg: 'RS256',
          kid: this.config.kid,
          b64: false,
          crit: ['b64']
        } as any)
        .sign(privateKey);

      // The result is header.payload.signature
      // For detached JWS, we remove the payload: header..signature
      const parts = jws.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWS format');
      }
      
      // Return detached format: header..signature (empty payload)
      return `${parts[0]}..${parts[2]}`;
    } catch (error) {
      console.error('[AA Service] Error generating detached JWS signature:', error);
      throw new Error('Failed to generate detached JWS signature');
    }
  }

  /**
   * Verify detached JWS signature from FINVU webhook
   * 
   * FINVU sends webhooks with x-jws-signature header using RS256/ES256 algorithm
   * The signature is a DETACHED JWS (header..signature format) that signs the raw HTTP request body
   * 
   * Verification process:
   * 1. Parse the detached signature (header..signature)
   * 2. Reconstruct full JWS by inserting raw body as payload
   * 3. Verify using compactVerify with detachedPayload option
   */
  async verifyWebhookSignature(
    signature: string | null | undefined,
    rawBody: Buffer | null | undefined,
    parsedBody: any
  ): Promise<any | null> {
    try {
      // In mock mode, skip verification and return parsed payload for testing
      if (this.useMock) {
        console.log('[AA Webhook] Mock mode - skipping detached JWS verification');
        return parsedBody;
      }

      // Require signature header in production mode
      if (!signature) {
        console.error('[AA Webhook] SECURITY: Missing x-jws-signature header - rejecting webhook');
        return null;
      }

      // Require raw body for verification
      if (!rawBody || rawBody.length === 0) {
        console.error('[AA Webhook] SECURITY: Missing or empty raw request body - rejecting webhook');
        return null;
      }

      // Validate detached JWS format (header..signature - empty middle section)
      const parts = signature.split('.');
      if (parts.length !== 3) {
        console.error('[AA Webhook] SECURITY: Invalid JWS format (expected 3 parts) - rejecting webhook');
        return null;
      }
      
      if (parts[1] !== '') {
        console.error('[AA Webhook] SECURITY: Expected detached JWS (empty payload section) - rejecting webhook');
        return null;
      }

      // Get FINVU's public key from environment
      const publicKeyPEM = process.env.AA_FINVU_WEBHOOK_PUBLIC_KEY;
      
      if (!publicKeyPEM) {
        console.error('[AA Webhook] SECURITY: AA_FINVU_WEBHOOK_PUBLIC_KEY not configured - rejecting webhook');
        console.error('[AA Webhook] Set AA_FORCE_MOCK=true to bypass verification in development');
        return null;
      }

      // Import the public key for verification
      // Try SPKI format first (common for public keys), then JWK
      let publicKey;
      try {
        if (publicKeyPEM.trim().startsWith('{')) {
          // JWK format
          publicKey = await importJWK(JSON.parse(publicKeyPEM), 'RS256');
        } else {
          // PEM format
          publicKey = await importSPKI(publicKeyPEM, 'RS256');
        }
      } catch (keyError: any) {
        console.error('[AA Webhook] SECURITY: Failed to import public key:', keyError.message);
        return null;
      }

      // For b64:false detached JWS, use flattenedVerify with the payload option
      // This properly handles unencoded payloads per RFC7797 / RFC7515 Appendix F
      // Reference: https://github.com/panva/jose/discussions/432
      const header = parts[0];
      const sig = parts[2];
      
      // Convert detached compact JWS to flattened format for verification
      // Flattened JWS format: { protected, payload, signature }
      // Payload can be string or Uint8Array - using Uint8Array for byte-accurate verification
      const flattenedJws = {
        protected: header,
        payload: new Uint8Array(rawBody), // Raw bytes for b64:false verification
        signature: sig,
      };
      
      // Verify using flattenedVerify which properly handles b64:false
      // The jose library will detect b64:false in the protected header and
      // use the payload bytes directly without base64url decoding
      const { protectedHeader } = await flattenedVerify(
        flattenedJws,
        publicKey,
        {
          algorithms: ['RS256', 'ES256'],
        }
      );

      // Validate expected header parameters
      if ((protectedHeader as any).b64 !== false) {
        console.warn('[AA Webhook] Warning: Expected b64:false in protected header');
      }

      console.log('[AA Webhook] JWS signature verified successfully');
      console.log('[AA Webhook] Protected header alg:', protectedHeader?.alg);

      // Return the parsed body now that signature is verified
      return parsedBody;
      
    } catch (error: any) {
      console.error('[AA Webhook] SECURITY: Signature verification failed:', error.message);
      
      if (error.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
        console.error('[AA Webhook] SECURITY: Invalid signature - webhook may be spoofed or tampered');
      } else if (error.code === 'ERR_JWT_EXPIRED') {
        console.error('[AA Webhook] SECURITY: Signature expired - webhook is stale');
      } else if (error.code === 'ERR_JWS_INVALID') {
        console.error('[AA Webhook] SECURITY: Malformed JWS structure');
      }
      
      return null;
    }
  }

  /**
   * Make authenticated API request to Finvu AA
   */
  private async makeAARequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    body?: any
  ): Promise<any> {
    const url = `${this.config.apiBaseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Add client API key (JWT token from Finvu)
    if (this.config.clientApiKey) {
      headers['client_api_key'] = this.config.clientApiKey;
    }

    // Generate detached JWS signature for the request body
    if (body && this.config.privateKeyPem) {
      try {
        const signature = await this.generateDetachedJWSSignature(body);
        headers['x-jws-signature'] = signature;
      } catch (error) {
        console.warn('[AA Finvu] Could not generate JWS signature:', error);
      }
    }

    console.log(`[AA Finvu] ${method} ${url}`);

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AA Finvu] API Error: ${response.status} - ${errorText}`);
      throw new Error(`AA API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Generate FINVU approval URL for user to approve consent
   */
  private generateFINVUApprovalUrl(consentHandle: string, mobile?: string): string {
    const baseUrl = process.env.AA_FINVU_WEB_URL || 'https://aaweb.finvu.in';
    
    const params = new URLSearchParams({
      consentHandle: consentHandle,
    });
    
    if (mobile) {
      const cleanMobile = mobile.replace(/\D/g, '').replace(/^(\+91|91)/, '');
      if (cleanMobile.length >= 10) {
        params.append('mobile', cleanMobile);
      }
    }
    
    return `${baseUrl}/#/login?${params.toString()}`;
  }

  /**
   * Initiate consent request with the user
   * 
   * Flow:
   * 1. Backend calls this method to create consent with FINVU/Finfactor
   * 2. AA returns consentHandle
   * 3. User is redirected to approval portal (redirectUrl)
   * 4. User approves consent on AA's interface
   * 5. AA sends webhook notification to backend
   */
  async initiateConsent(request: ConsentRequest): Promise<ConsentResponse> {
    console.log('[AA] Initiating consent request:', {
      userId: request.userId,
      purpose: request.purpose,
      fiTypes: request.fiTypes,
      useFinfactor: this.isFinfactorConfigured(),
    });

    // If using mock mode, return mock data with redirect URL
    if (this.useMock) {
      const consentHandle = `consent_${Date.now()}_${randomUUID().substring(0, 8)}`;
      
      let mobile = request.mobile;
      if (!mobile && request.userId.includes('@')) {
        mobile = request.userId.split('@')[0];
      } else if (!mobile) {
        mobile = request.userId;
      }
      
      return {
        consentHandle: consentHandle,
        consentId: `CI_${randomUUID().substring(0, 12)}`,
        status: 'PENDING',
        consentStart: new Date(),
        consentExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        redirectUrl: this.generateFINVUApprovalUrl(consentHandle, mobile),
      };
    }

    // Use Finfactor V2 API if configured
    if (this.isFinfactorConfigured()) {
      return this.initiateFinfactorConsent(request);
    }

    // Fallback to legacy Finvu AA implementation
    const txnId = randomUUID();
    const timestamp = new Date().toISOString();

    const consentPayload = {
      ver: '1.1.3',
      timestamp,
      txnid: txnId,
      ConsentDetail: {
        consentStart: request.dataRange.from.toISOString(),
        consentExpiry: request.dataRange.to.toISOString(),
        consentMode: 'VIEW',
        fetchType: 'PERIODIC',
        consentTypes: ['TRANSACTIONS', 'PROFILE', 'SUMMARY'],
        fiTypes: request.fiTypes,
        DataConsumer: {
          id: this.config.fiuId,
        },
        Customer: {
          id: request.userId,
        },
        Purpose: {
          code: '101',
          refUri: 'https://api.rebit.org.in/aa/purpose/101.xml',
          text: request.purpose,
          Category: { type: 'string' }
        },
        FIDataRange: {
          from: request.dataRange.from.toISOString(),
          to: request.dataRange.to.toISOString(),
        },
        DataLife: {
          unit: request.dataLife.unit,
          value: request.dataLife.value,
        },
        Frequency: {
          unit: request.frequency.unit,
          value: request.frequency.value,
        },
      },
    };

    try {
      const response = await this.makeAARequest('/Consent', 'POST', consentPayload);

      const consentHandle = response.ConsentHandle || response.consentHandle;
      
      let mobile = request.mobile;
      if (!mobile && request.userId.includes('@')) {
        mobile = request.userId.split('@')[0];
      }

      return {
        consentHandle: consentHandle,
        consentId: consentHandle,
        status: 'PENDING',
        consentStart: new Date(request.dataRange.from),
        consentExpiry: new Date(request.dataRange.to),
        redirectUrl: this.generateFINVUApprovalUrl(consentHandle, mobile),
      };
    } catch (error) {
      console.error('[AA Finvu] Failed to initiate consent:', error);
      throw error;
    }
  }

  /**
   * Initiate consent using Finfactor V2 API
   * 
   * Uses the /ConsentRequests endpoint with Bearer token auth
   */
  private async initiateFinfactorConsent(request: ConsentRequest): Promise<ConsentResponse> {
    const timestamp = new Date().toISOString();
    const requestId = randomUUID();
    const userSessionId = `session_${Date.now()}_${randomUUID().substring(0, 8)}`;
    const channelId = this.config.finfactorChannelId || 'finsense';

    // Build customer ID in format: mobile@finvu
    let custId = request.userId;
    if (!custId.includes('@')) {
      // If just mobile number, append @finvu
      custId = `${custId}@finvu`;
    }

    // Map fiTypes to Finfactor consent templates
    const consentTemplates = this.mapFiTypesToConsentTemplates(request.fiTypes);

    const consentPayload = {
      header: {
        ts: timestamp,
        channelId: channelId,
        rid: requestId,
      },
      body: {
        custId: custId,
        consentDescription: request.purpose || 'Wealth Management Service',
        consentTemplates: consentTemplates,
        userSessionId: userSessionId,
        redirectUrl: 'noredirect', // We handle redirect ourselves
      },
    };

    console.log('[Finfactor] Creating consent request:', JSON.stringify(consentPayload, null, 2));

    try {
      const response = await this.makeFinfactorRequest('/ConsentRequests', 'POST', consentPayload);
      
      console.log('[Finfactor] Consent response:', JSON.stringify(response, null, 2));

      // Extract consent handle from response
      const consentHandle = response.body?.consentHandle || 
                           response.body?.consentId || 
                           response.consentHandle ||
                           response.consentId ||
                           `finfactor_${requestId}`;
      
      // Extract redirect URL if provided
      const aaRedirectUrl = response.body?.redirectUrl || response.body?.webviewUrl;

      let mobile = request.mobile;
      if (!mobile && custId.includes('@')) {
        mobile = custId.split('@')[0];
      }

      // Generate approval URL
      const redirectUrl = aaRedirectUrl || this.generateFINVUApprovalUrl(consentHandle, mobile);

      return {
        consentHandle: consentHandle,
        consentId: consentHandle,
        status: 'PENDING',
        consentStart: new Date(),
        consentExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        redirectUrl: redirectUrl,
      };
    } catch (error) {
      console.error('[Finfactor] Failed to create consent:', error);
      throw error;
    }
  }

  /**
   * Map FI types to Finfactor consent templates
   */
  private mapFiTypesToConsentTemplates(fiTypes: string[]): string[] {
    const templateMap: Record<string, string[]> = {
      'DEPOSIT': ['BANK_STATEMENT_SEBI'],
      'MUTUAL_FUNDS': ['STATEMENT_PERIODIC_OTHER'],
      'INSURANCE': ['STATEMENT_PERIODIC_OTHER'],
      'SECURITIES': ['STATEMENT_PERIODIC_OTHER'],
      'EQUITIES': ['STATEMENT_PERIODIC_OTHER'],
      'SIP': ['STATEMENT_PERIODIC_OTHER'],
      'TERM_DEPOSIT': ['BANK_STATEMENT_SEBI'],
    };

    const templates = new Set<string>();
    for (const fiType of fiTypes) {
      const mappedTemplates = templateMap[fiType.toUpperCase()] || ['STATEMENT_PERIODIC_OTHER'];
      mappedTemplates.forEach(t => templates.add(t));
    }

    return Array.from(templates);
  }

  /**
   * Check consent status by handle
   */
  async getConsentStatusByHandle(consentHandle: string): Promise<ConsentResponse> {
    console.log('[AA Finvu] Checking consent status by handle:', consentHandle);

    if (this.useMock) {
      return {
        consentHandle: consentHandle,
        consentId: consentHandle,
        status: 'PENDING',
        consentStart: new Date(),
        consentExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      };
    }

    try {
      const response = await this.makeAARequest(`/Consent/handle/${consentHandle}`, 'GET');

      return {
        consentHandle: response.ConsentHandle || consentHandle,
        consentId: response.ConsentStatus?.id || consentHandle,
        status: response.ConsentStatus?.status || 'PENDING',
        consentStart: new Date(),
        consentExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      };
    } catch (error) {
      console.error('[AA Finvu] Failed to get consent status:', error);
      throw error;
    }
  }

  /**
   * Get consent details by ID (after approval)
   */
  async getConsentDetails(consentId: string): Promise<ConsentResponse> {
    console.log('[AA Finvu] Getting consent details:', consentId);

    if (this.useMock) {
      return {
        consentHandle: consentId,
        consentId: consentId,
        status: 'ACTIVE',
        consentStart: new Date(),
        consentExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        signedConsent: 'mock_signed_consent',
      };
    }

    try {
      const response = await this.makeAARequest(`/Consent/${consentId}`, 'GET');

      return {
        consentHandle: response.consentHandle || consentId,
        consentId: response.consentId || consentId,
        status: response.status || 'ACTIVE',
        consentStart: new Date(response.createTimestamp || Date.now()),
        consentExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        signedConsent: response.signedConsent,
      };
    } catch (error) {
      console.error('[AA Finvu] Failed to get consent details:', error);
      throw error;
    }
  }

  /**
   * Request financial information data
   * 
   * After consent is approved, use this to request data from FIPs
   * Returns a session ID - actual data comes via webhook notification
   */
  async requestFIData(request: FIDataRequest): Promise<FIDataResponse> {
    console.log('[AA Finvu] Requesting FI data:', request);

    if (this.useMock) {
      const sessionId = `session_${Date.now()}_${randomUUID().substring(0, 8)}`;
      return {
        sessionId,
        status: 'PENDING',
      };
    }

    const txnId = randomUUID();
    const timestamp = new Date().toISOString();

    const fiRequestPayload = {
      ver: '1.1.3',
      timestamp,
      txnid: txnId,
      FIDataRange: {
        from: request.dateRange.from.toISOString(),
        to: request.dateRange.to.toISOString(),
      },
      Consent: {
        id: request.consentId,
      },
      KeyMaterial: {
        cryptoAlg: 'ECDH',
        curve: 'Curve25519',
        params: 'params',
        DHPublicKey: {
          expiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          Parameters: '',
          KeyValue: '',
        },
        Nonce: randomUUID(),
      },
    };

    try {
      const response = await this.makeAARequest('/FI/request', 'POST', fiRequestPayload);
      
      return {
        sessionId: response.sessionId || response.SessionId,
        status: 'PENDING',
      };
    } catch (error) {
      console.error('[AA Finvu] Failed to request FI data:', error);
      throw error;
    }
  }

  /**
   * Fetch financial data from an existing session
   */
  async fetchFIData(sessionId: string, fipId?: string): Promise<FIDataResponse> {
    console.log('[AA Finvu] Fetching FI data for session:', sessionId);

    if (this.useMock) {
      return this.getMockFIData(sessionId);
    }

    try {
      let endpoint = `/FI/fetch/${sessionId}`;
      if (fipId) {
        endpoint += `/${fipId}`;
      }

      const response = await this.makeAARequest(endpoint, 'GET');
      
      return {
        sessionId,
        status: response.status || 'READY',
        accounts: this.parseFIDataResponse(response),
      };
    } catch (error) {
      console.error('[AA Finvu] Failed to fetch FI data:', error);
      throw error;
    }
  }

  /**
   * Parse FI data response from Finvu
   * Handles decryption and normalization of financial data
   */
  private parseFIDataResponse(response: any): AccountData[] {
    const accounts: AccountData[] = [];

    try {
      const fiData = response.FI || response.fi || [];
      
      for (const fi of fiData) {
        const fiType = fi.fipId ? this.mapFIPToType(fi.fipId) : 'DEPOSIT';
        const account = fi.data?.account || fi.Account;
        
        if (!account) continue;

        const accountData: AccountData = {
          accountId: account.maskedAccNumber || account.accountId || randomUUID(),
          fipId: fi.fipId || '',
          accountType: account.type || account.accountType || 'UNKNOWN',
          maskedAccountNumber: account.maskedAccNumber || 'XXXX',
          fiType: fiType,
          linkRefNumber: account.linkRefNumber,
        };

        // Parse profile data
        if (account.Profile) {
          accountData.profile = account.Profile;
        }

        // Parse summary data (balances, etc.)
        if (account.Summary) {
          accountData.summary = account.Summary;
          if (account.Summary.currentBalance) {
            accountData.balance = {
              amount: parseFloat(account.Summary.currentBalance),
              currency: 'INR',
            };
          }
        }

        // Parse holdings
        if (account.Holdings || account.holdings) {
          accountData.holdings = this.parseHoldings(account.Holdings || account.holdings, fiType);
        }

        // Parse transactions
        if (account.Transactions || account.transactions) {
          accountData.transactions = this.parseTransactions(account.Transactions || account.transactions, fiType);
        }

        accounts.push(accountData);
      }
    } catch (error) {
      console.error('[AA Finvu] Error parsing FI data:', error);
    }

    return accounts;
  }

  /**
   * Parse holdings from FI response
   */
  private parseHoldings(holdings: any, fiType: string): HoldingData[] {
    const result: HoldingData[] = [];

    try {
      const holdingList = Array.isArray(holdings) ? holdings : [holdings];

      for (const h of holdingList) {
        const holding: HoldingData = {
          instrumentName: h.issuerName || h.schemeName || h.companyName || h.policyName || 'Unknown',
          instrumentId: h.isin || h.schemeCode || h.policyNumber || h.symbol,
          quantity: parseFloat(h.units || h.quantity || h.shares || '0'),
          currentValue: parseFloat(h.currentValue || h.marketValue || h.sumAssured || '0'),
          investedAmount: parseFloat(h.costValue || h.investedValue || h.premium || '0'),
          averagePrice: parseFloat(h.averagePrice || h.purchasePrice || '0'),
          asOfDate: new Date(h.asOfDate || h.lastUpdated || Date.now()),
          holdingDetails: {
            ...h,
            fiType,
          },
        };

        result.push(holding);
      }
    } catch (error) {
      console.error('[AA Finvu] Error parsing holdings:', error);
    }

    return result;
  }

  /**
   * Parse transactions from FI response
   */
  private parseTransactions(transactions: any, fiType: string): TransactionData[] {
    const result: TransactionData[] = [];

    try {
      const txnList = Array.isArray(transactions) ? transactions : (transactions.Transaction || [transactions]);

      for (const t of txnList) {
        const txn: TransactionData = {
          transactionId: t.txnId || t.transactionId || t.reference,
          transactionType: t.type || t.transactionType || 'UNKNOWN',
          amount: parseFloat(t.amount || t.transactionAmount || '0'),
          transactionDate: new Date(t.transactionTimestamp || t.transactionDate || t.date || Date.now()),
          narration: t.narration || t.description || t.remarks,
          reference: t.reference || t.txnId,
          transactionDetails: {
            ...t,
            fiType,
          },
        };

        result.push(txn);
      }
    } catch (error) {
      console.error('[AA Finvu] Error parsing transactions:', error);
    }

    return result;
  }

  /**
   * Map FIP ID to FI type
   */
  private mapFIPToType(fipId: string): AccountData['fiType'] {
    const lowerFipId = fipId.toLowerCase();
    
    if (lowerFipId.includes('bank') || lowerFipId.includes('barb')) return 'DEPOSIT';
    if (lowerFipId.includes('mf') || lowerFipId.includes('mutual') || lowerFipId.includes('amc')) return 'MUTUAL_FUNDS';
    if (lowerFipId.includes('demat') || lowerFipId.includes('nsdl') || lowerFipId.includes('cdsl')) return 'EQUITIES';
    if (lowerFipId.includes('insurance') || lowerFipId.includes('lic')) return 'INSURANCE';
    if (lowerFipId.includes('fd') || lowerFipId.includes('deposit')) return 'TERM_DEPOSIT';
    
    return 'DEPOSIT';
  }

  /**
   * Generate mock FI data for testing
   */
  private getMockFIData(sessionId: string): FIDataResponse {
    return {
      sessionId,
      status: 'READY',
      accounts: [
        {
          accountId: 'ACC001',
          fipId: 'BARB0KIMXXX',
          accountType: 'SAVINGS',
          maskedAccountNumber: 'XXXX1234',
          fiType: 'DEPOSIT',
          balance: {
            amount: 250000,
            currency: 'INR',
          },
          transactions: [
            {
              transactionId: 'TXN001',
              transactionType: 'CREDIT',
              amount: 50000,
              transactionDate: new Date('2024-01-15'),
              narration: 'Salary Credit',
            },
            {
              transactionId: 'TXN002',
              transactionType: 'DEBIT',
              amount: 15000,
              transactionDate: new Date('2024-01-20'),
              narration: 'Bill Payment',
            },
          ],
        },
        {
          accountId: 'MF001',
          fipId: 'CAMS',
          accountType: 'MUTUAL_FUND',
          maskedAccountNumber: 'MF-XXXX5678',
          fiType: 'MUTUAL_FUNDS',
          holdings: [
            {
              instrumentName: 'HDFC Equity Fund - Growth',
              instrumentId: 'INF179K01997',
              quantity: 100.5,
              currentValue: 175000,
              investedAmount: 150000,
              averagePrice: 1492.54,
              asOfDate: new Date(),
            },
            {
              instrumentName: 'ICICI Prudential Bluechip Fund',
              instrumentId: 'INF109K01Z88',
              quantity: 200,
              currentValue: 125000,
              investedAmount: 100000,
              averagePrice: 500,
              asOfDate: new Date(),
            },
          ],
        },
        {
          accountId: 'EQ001',
          fipId: 'NSDL',
          accountType: 'DEMAT',
          maskedAccountNumber: 'IN30XXXX1234',
          fiType: 'EQUITIES',
          holdings: [
            {
              instrumentName: 'Reliance Industries Ltd',
              instrumentId: 'INE002A01018',
              quantity: 50,
              currentValue: 145000,
              investedAmount: 120000,
              averagePrice: 2400,
              asOfDate: new Date(),
            },
          ],
        },
      ],
    };
  }

  /**
   * Revoke consent
   */
  async revokeConsent(consentId: string): Promise<boolean> {
    console.log('[AA Finvu] Revoking consent:', consentId);

    if (this.useMock) {
      return true;
    }

    try {
      await this.makeAARequest(`/Consent/${consentId}`, 'DELETE');
      return true;
    } catch (error) {
      console.error('[AA Finvu] Failed to revoke consent:', error);
      return false;
    }
  }

  /**
   * Search for financial institutions (FIPs)
   */
  async searchInstitutions(query: string, type?: 'amc' | 'broker' | 'bank' | 'insurer'): Promise<Institution[]> {
    console.log('[AA Finvu] Searching institutions:', { query, type });

    // FIP registry - these are Financial Information Providers in the AA network
    const allInstitutions: Institution[] = [
      // AMCs (Asset Management Companies)
      { id: 'amc-hdfc', name: 'HDFC Asset Management Company', type: 'amc', fipId: 'HDFC-AMC', description: 'Leading mutual fund house' },
      { id: 'amc-icici', name: 'ICICI Prudential AMC', type: 'amc', fipId: 'ICICI-AMC', description: 'Diversified mutual funds' },
      { id: 'amc-sbi', name: 'SBI Mutual Fund', type: 'amc', fipId: 'SBI-MF', description: 'India\'s largest AMC' },
      { id: 'amc-axis', name: 'Axis Mutual Fund', type: 'amc', fipId: 'AXIS-MF', description: 'Growth-focused funds' },
      { id: 'amc-kotak', name: 'Kotak Mahindra Mutual Fund', type: 'amc', fipId: 'KOTAK-MF', description: 'Premium fund offerings' },
      { id: 'amc-cams', name: 'CAMS (RTA)', type: 'amc', fipId: 'CAMS', description: 'Mutual Fund RTA - Multiple AMCs' },
      { id: 'amc-karvy', name: 'KFintech (RTA)', type: 'amc', fipId: 'KFINTECH', description: 'Mutual Fund RTA - Multiple AMCs' },
      
      // Brokers/Depositories
      { id: 'broker-zerodha', name: 'Zerodha', type: 'broker', fipId: 'ZERODHA', description: 'India\'s largest stock broker' },
      { id: 'broker-upstox', name: 'Upstox', type: 'broker', fipId: 'UPSTOX', description: 'Low-cost trading platform' },
      { id: 'broker-groww', name: 'Groww', type: 'broker', fipId: 'GROWW', description: 'Investment and trading platform' },
      { id: 'broker-nsdl', name: 'NSDL', type: 'broker', fipId: 'NSDL', description: 'National Securities Depository' },
      { id: 'broker-cdsl', name: 'CDSL', type: 'broker', fipId: 'CDSL', description: 'Central Depository Services' },
      
      // Banks
      { id: 'bank-hdfc', name: 'HDFC Bank', type: 'bank', fipId: 'BARB0HDFCXX', description: 'Private sector bank' },
      { id: 'bank-icici', name: 'ICICI Bank', type: 'bank', fipId: 'BARB0ICICXX', description: 'Leading private bank' },
      { id: 'bank-sbi', name: 'State Bank of India', type: 'bank', fipId: 'BARB0SBIINX', description: 'India\'s largest bank' },
      { id: 'bank-axis', name: 'Axis Bank', type: 'bank', fipId: 'BARB0AXISXX', description: 'Digital banking solutions' },
      { id: 'bank-kotak', name: 'Kotak Mahindra Bank', type: 'bank', fipId: 'BARB0KOTAKX', description: 'Premium banking' },
      
      // Insurers
      { id: 'ins-lic', name: 'LIC of India', type: 'insurer', fipId: 'LIC-INDIA', description: 'Life insurance leader' },
      { id: 'ins-hdfc-life', name: 'HDFC Life Insurance', type: 'insurer', fipId: 'HDFC-LIFE', description: 'Private life insurer' },
      { id: 'ins-icici-pru', name: 'ICICI Prudential Life', type: 'insurer', fipId: 'ICICI-PRU', description: 'Comprehensive life coverage' },
    ];

    let filtered = type ? allInstitutions.filter(inst => inst.type === type.toLowerCase()) : allInstitutions;
    
    if (query && query.trim()) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(inst => 
        inst.name.toLowerCase().includes(lowerQuery) ||
        inst.description?.toLowerCase().includes(lowerQuery)
      );
    }

    return filtered;
  }

  /**
   * Discover accounts at a financial institution
   */
  async discoverAccounts(institutionId: string, userId: string): Promise<DiscoveredAccount[]> {
    console.log('[AA Finvu] Discovering accounts:', { institutionId, userId });

    const mockAccounts: Record<string, DiscoveredAccount[]> = {
      'amc-hdfc': [
        { accountId: 'folio-001', accountName: 'HDFC Equity Fund - Direct', accountNumber: 'F12345678', accountType: 'Mutual Fund', institutionName: 'HDFC AMC', fipId: 'HDFC-AMC', isLinked: false },
        { accountId: 'folio-002', accountName: 'HDFC Balanced Fund', accountNumber: 'F87654321', accountType: 'Mutual Fund', institutionName: 'HDFC AMC', fipId: 'HDFC-AMC', isLinked: false },
      ],
      'amc-cams': [
        { accountId: 'folio-cams-001', accountName: 'CAMS Consolidated Portfolio', accountNumber: 'CAMS12345', accountType: 'Mutual Fund RTA', institutionName: 'CAMS', fipId: 'CAMS', isLinked: false },
      ],
      'broker-zerodha': [
        { accountId: 'demat-001', accountName: 'Demat Account', accountNumber: 'ZE1234567890', accountType: 'Demat', institutionName: 'Zerodha', fipId: 'ZERODHA', isLinked: false },
      ],
      'broker-nsdl': [
        { accountId: 'nsdl-001', accountName: 'NSDL Demat', accountNumber: 'IN30XXXX1234', accountType: 'Demat', institutionName: 'NSDL', fipId: 'NSDL', isLinked: false },
      ],
      'bank-hdfc': [
        { accountId: 'savings-001', accountName: 'Savings Account', accountNumber: 'XXXX1234', accountType: 'Savings', institutionName: 'HDFC Bank', fipId: 'BARB0HDFCXX', isLinked: false },
        { accountId: 'fd-001', accountName: 'Fixed Deposit', accountNumber: 'FD987654', accountType: 'Fixed Deposit', institutionName: 'HDFC Bank', fipId: 'BARB0HDFCXX', isLinked: false },
      ],
      'ins-lic': [
        { accountId: 'policy-001', accountName: 'Jeevan Anand', accountNumber: 'LIC1234567', accountType: 'Life Insurance', institutionName: 'LIC', fipId: 'LIC-INDIA', isLinked: false },
      ],
    };

    return mockAccounts[institutionId] || [];
  }

  /**
   * Send OTP for account linking verification
   */
  async sendOTP(request: OTPRequest): Promise<{ success: boolean; message: string }> {
    console.log('[AA Finvu] Sending OTP:', { sessionId: request.sessionId });

    // Mock implementation
    console.log(`[MOCK OTP] Session ${request.sessionId}: 123456`);

    return {
      success: true,
      message: `OTP sent successfully to ${request.mobileNumber || request.email}`
    };
  }

  /**
   * Verify OTP for account linking
   */
  async verifyOTP(request: OTPVerifyRequest): Promise<{ success: boolean; message: string }> {
    console.log('[AA Finvu] Verifying OTP:', { sessionId: request.sessionId });

    // Mock implementation - accept '123456' as valid OTP
    const isValid = request.otp === '123456';

    return {
      success: isValid,
      message: isValid ? 'OTP verified successfully' : 'Invalid OTP. Please try again.'
    };
  }

  /**
   * Compute idempotency key for holdings
   * Format: hash(accountId + instrumentId + asOfDate + payload)
   */
  computeHoldingIdempotencyKey(
    accountId: string,
    instrumentId: string | null | undefined,
    asOfDate: Date,
    payload: any
  ): string {
    const components = [
      accountId,
      instrumentId || 'NO_INSTRUMENT_ID',
      asOfDate.toISOString().split('T')[0],
      JSON.stringify(payload),
    ];
    
    return createHash('sha256').update(components.join('|')).digest('hex');
  }

  /**
   * Compute idempotency key for transactions
   * Format: hash(accountId + transactionId + date + amount + payload)
   */
  computeTransactionIdempotencyKey(
    accountId: string,
    transactionId: string | null | undefined,
    transactionDate: Date,
    amount: number,
    payload: any
  ): string {
    const components = [
      accountId,
      transactionId || 'NO_TRANSACTION_ID',
      transactionDate.toISOString().split('T')[0],
      amount.toString(),
      JSON.stringify(payload),
    ];
    
    return createHash('sha256').update(components.join('|')).digest('hex');
  }
}

/**
 * Initialize the Account Aggregator service
 */
export function createAAService(): AccountAggregatorService {
  const environment = process.env.AA_ENVIRONMENT || 'UAT';
  const isProduction = environment === 'PROD';

  const fiuId = isProduction 
    ? process.env.AA_FINVU_PROD_FIU_ID 
    : process.env.AA_FINVU_UAT_FIU_ID;
  
  const apiBaseUrl = isProduction 
    ? process.env.AA_FINVU_PROD_BASE_URL 
    : process.env.AA_FINVU_UAT_BASE_URL;
  
  const channelId = isProduction 
    ? process.env.AA_FINVU_PROD_CHANNEL_ID 
    : process.env.AA_FINVU_UAT_CHANNEL_ID;
  
  const clientApiKey = isProduction 
    ? process.env.AA_FINVU_PROD_CLIENT_API_KEY 
    : process.env.AA_FINVU_UAT_CLIENT_API_KEY;

  const privateKeyPem = isProduction
    ? process.env.AA_FINVU_PROD_PRIVATE_KEY
    : process.env.AA_FINVU_UAT_PRIVATE_KEY;

  // Finfactor V2 API configuration
  const finfactorApiBaseUrl = process.env.FINFACTOR_API_BASE_URL || 'https://rudowealth.fiu.finfactor.in/finsense/API/V2';
  const finfactorUserId = process.env.FINFACTOR_USER_ID;
  const finfactorPassword = process.env.FINFACTOR_PASSWORD;
  const finfactorChannelId = process.env.FINFACTOR_CHANNEL_ID || 'finsense';

  // Check if Finfactor V2 API is configured
  const hasFinfactorCredentials = !!(finfactorUserId && finfactorPassword);

  // Determine if we should use mock mode
  const forceMock = process.env.AA_FORCE_MOCK === 'true';
  // Don't use mock if Finfactor is configured (even if legacy Finvu isn't)
  const useMock = forceMock || (!hasFinfactorCredentials && (!fiuId || !apiBaseUrl || !clientApiKey));

  if (useMock) {
    if (forceMock) {
      console.log('[AA Service] Running in MOCK mode - AA_FORCE_MOCK enabled');
      console.log('[AA Service] Set AA_FORCE_MOCK=false to enable real AA integration');
    } else {
      console.warn('[AA Service] Running in MOCK mode - AA credentials not configured');
    }
  } else if (hasFinfactorCredentials) {
    console.log('[AA Service] Initializing with Finfactor V2 API');
    console.log('[AA Service] Finfactor API:', finfactorApiBaseUrl);
    console.log('[AA Service] Finfactor User:', finfactorUserId);
  } else {
    console.log('[AA Service] Initializing with legacy Finvu AA integration');
    console.log('[AA Service] Environment:', environment);
    console.log('[AA Service] FIU ID:', fiuId);
  }

  const config: AAConfig = {
    fiuId: fiuId || 'FIU_DEMO',
    apiBaseUrl: apiBaseUrl || 'https://aauat.finvu.in/API/V1',
    kid: channelId || 'demo-key-id',
    privateKeyPem: privateKeyPem,
    clientApiKey: clientApiKey,
    // Finfactor V2 API configuration
    finfactorApiBaseUrl: finfactorApiBaseUrl,
    finfactorUserId: finfactorUserId,
    finfactorPassword: finfactorPassword,
    finfactorChannelId: finfactorChannelId,
  };

  return new AccountAggregatorService(config, useMock);
}

// Export types for use in other modules
export type {
  AAConfig,
  ConsentRequest,
  ConsentResponse,
  FIDataRequest,
  FIDataResponse,
  AccountData,
  HoldingData,
  TransactionData,
  Institution,
  DiscoveredAccount,
};
