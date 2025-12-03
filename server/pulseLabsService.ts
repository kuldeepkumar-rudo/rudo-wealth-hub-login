import { log } from "./vite";
import type { InsertPulseLabsMutualFundScheme } from "@shared/schema";

const BASE_URL = "https://pulsedb-qa.pulselabs.co.in/rest/api/v1";

interface PulseLabsAuthResponse {
  status: {
    code: number;
    message: string;
  };
  data?: {
    auth?: string;
  };
}

interface PulseLabsResponse<T = any> {
  status: {
    code: number;
    message: string;
  };
  data?: T;
}

export interface NavHistoryItem {
  date: string;
  nav: string | number;
}

export interface FundHolding {
  name: string;
  percentage?: number;
  sector?: string;
}

export interface RiskMetric {
  standard_deviation?: number;
  sharpe_ratio?: number;
  beta?: number;
  alpha?: number;
  volatility?: number;
}

export interface FundCard {
  scheme_code: string;
  scheme_name: string;
  category?: string;
  sub_category?: string;
  amc_name?: string;
  current_nav?: string | number;
  nav_date?: string;
  returns?: Record<string, number>;
  risk_metrics?: RiskMetric;
  holdings?: FundHolding[];
}

export interface AssetCategory {
  category: string;
  count?: number;
}

export interface AssetSubCategory {
  category: string;
  sub_category: string;
  count?: number;
}

export interface FundRating {
  scheme_code: string;
  rating?: number;
  rating_agency?: string;
  risk_level?: string;
}

export interface AnalyticalData {
  scheme_code: string;
  returns?: Record<string, number>;
  volatility?: number;
  sharpe_ratio?: number;
  sortino_ratio?: number;
  beta?: number;
  alpha?: number;
}

export interface TopChartItem {
  scheme_code: string;
  scheme_name: string;
  returns?: Record<string, number>;
  amc_name?: string;
  category?: string;
}

export interface NFOItem {
  scheme_code: string;
  scheme_name: string;
  amc_name?: string;
  nfo_start_date?: string;
  nfo_end_date?: string;
  minimum_investment?: number;
}

class PulseLabsService {
  private authToken: string | null = null;
  private partner: string;
  private key: string;

  constructor() {
    this.partner = process.env.PULSE_LABS_PARTNER || "";
    this.key = process.env.PULSE_LABS_KEY || "";

    if (!this.partner || !this.key) {
      log("[Pulse Labs] Missing credentials - PULSE_LABS_PARTNER or PULSE_LABS_KEY not set", "pulse-labs");
    }
  }

  /**
   * Authenticate with Pulse Labs API and get auth token
   */
  async authenticate(): Promise<string> {
    try {
      const response = await fetch(`${BASE_URL}/partner_login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          partner: this.partner,
          key: this.key,
        }),
      });

      const data: PulseLabsAuthResponse = await response.json();

      if (data.status.code === 200 && data.data?.auth) {
        this.authToken = data.data.auth;
        log("[Pulse Labs] Authentication successful", "pulse-labs");
        return this.authToken;
      }

      throw new Error(`Authentication failed: ${data.status.message}`);
    } catch (error) {
      log(`[Pulse Labs] Authentication error: ${error}`, "pulse-labs");
      throw error;
    }
  }

  /**
   * Ensure we have a valid auth token
   */
  private async ensureAuth(): Promise<string> {
    if (!this.authToken) {
      return await this.authenticate();
    }
    return this.authToken;
  }

  /**
   * Make authenticated API request with robust retry logic
   */
  private async makeRequest<T>(
    endpoint: string,
    body: Record<string, any> = {},
    retryCount = 0
  ): Promise<T> {
    const MAX_RETRIES = 2;
    const auth = await this.ensureAuth();

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auth,
          ...body,
        }),
      });

      // Handle HTTP-level auth errors before parsing JSON
      if ((response.status === 401 || response.status === 403) && retryCount < MAX_RETRIES) {
        log(`[Pulse Labs] HTTP ${response.status} auth error, clearing token and retrying...`, "pulse-labs");
        this.authToken = null;
        return this.makeRequest<T>(endpoint, body, retryCount + 1);
      }

      // Parse JSON with error handling
      let data: PulseLabsResponse<T>;
      try {
        data = await response.json();
      } catch (parseError) {
        // JSON parse failed - likely auth error with non-JSON response
        if ((response.status === 401 || response.status === 403) && retryCount < MAX_RETRIES) {
          log(`[Pulse Labs] JSON parse failed on auth error, retrying...`, "pulse-labs");
          this.authToken = null;
          return this.makeRequest<T>(endpoint, body, retryCount + 1);
        }
        throw new Error(`Failed to parse response: ${parseError}`);
      }

      // Handle auth errors in parsed response (MUST clear token before retry)
      if ((data.status.code === 401 || data.status.code === 403) && retryCount < MAX_RETRIES) {
        log(`[Pulse Labs] Auth error (${data.status.code}), clearing token and retrying...`, "pulse-labs");
        this.authToken = null; // Clear token BEFORE retry
        return this.makeRequest<T>(endpoint, body, retryCount + 1);
      }

      if (data.status.code === 200) {
        return data.data as T;
      }

      // Handle ZERO_RECORDS (206) as valid empty result
      if (data.status.code === 206) {
        log(`[Pulse Labs] No records found for ${endpoint}`, "pulse-labs");
        // Return empty object/array - will be handled by calling method
        return {} as T;
      }

      throw new Error(`API error (${data.status.code}): ${data.status.message}`);
    } catch (error) {
      // Retry on network/fetch errors
      if (retryCount < MAX_RETRIES && error instanceof Error && 
          (error.message.includes("fetch") || error.message.includes("network"))) {
        log(`[Pulse Labs] Network error, retrying... (${retryCount + 1}/${MAX_RETRIES})`, "pulse-labs");
        return this.makeRequest<T>(endpoint, body, retryCount + 1);
      }
      
      log(`[Pulse Labs] API request error for ${endpoint}: ${error}`, "pulse-labs");
      throw error;
    }
  }

  /**
   * Transform Pulse Labs scheme data to our schema format
   */
  private transformScheme(scheme: any): InsertPulseLabsMutualFundScheme {
    return {
      schemeCode: scheme.scheme_code || scheme.schemeCode || "",
      schemeName: scheme.scheme_name || scheme.schemeName || "",
      isin: scheme.isin || null,
      amcCode: scheme.amc_code || scheme.amcCode || null,
      amcName: scheme.amc_name || scheme.amcName || null,
      category: scheme.category || null,
      subCategory: scheme.sub_category || scheme.subCategory || null,
      schemeType: scheme.scheme_type || scheme.schemeType || null,
      navDate: scheme.nav_date || scheme.navDate || null,
      currentNav: scheme.current_nav || scheme.currentNav || null,
      rating: scheme.rating || null,
      riskLevel: scheme.risk_level || scheme.riskLevel || null,
      metadata: scheme.metadata || scheme,
    };
  }

  /**
   * Search for mutual fund schemes
   */
  async searchSchemes(query: string): Promise<InsertPulseLabsMutualFundScheme[]> {
    const data = await this.makeRequest<{ schemes: any[] }>("/mf/search", {
      search_text: query,
    });
    const schemes = data.schemes || [];
    return schemes.map((s) => this.transformScheme(s));
  }

  /**
   * Search by ISIN
   */
  async searchByISIN(isin: string): Promise<InsertPulseLabsMutualFundScheme | null> {
    try {
      const data = await this.makeRequest<{ scheme: any }>("/rta/scheme-search", {
        isin,
      });
      if (!data.scheme) return null;
      return this.transformScheme(data.scheme);
    } catch (error) {
      log(`[Pulse Labs] Failed to search by ISIN ${isin}: ${error}`, "pulse-labs");
      return null;
    }
  }

  /**
   * Get scheme metadata
   */
  async getSchemeMetadata(schemeCode: string): Promise<InsertPulseLabsMutualFundScheme | null> {
    try {
      const data = await this.makeRequest<any>("/mf/metadata", {
        scheme_code: schemeCode,
      });
      if (!data) return null;
      return this.transformScheme(data);
    } catch (error) {
      log(`[Pulse Labs] Failed to get metadata for ${schemeCode}: ${error}`, "pulse-labs");
      return null;
    }
  }

  /**
   * Get NAV history for a scheme
   */
  async getNavHistory(
    schemeCode: string,
    startDate?: string,
    endDate?: string
  ): Promise<NavHistoryItem[]> {
    const body: Record<string, any> = {
      scheme_code: schemeCode,
    };

    if (startDate) body.start_date = startDate;
    if (endDate) body.end_date = endDate;

    try {
      const data = await this.makeRequest<{ nav_history: NavHistoryItem[] }>(
        "/mf/nav-history",
        body
      );
      return data.nav_history || [];
    } catch (error) {
      log(`[Pulse Labs] Failed to get NAV history for ${schemeCode}: ${error}`, "pulse-labs");
      return [];
    }
  }

  /**
   * Get fund card (comprehensive fund details)
   */
  async getFundCard(schemeCode: string): Promise<FundCard | null> {
    try {
      const data = await this.makeRequest<FundCard>("/fundcard", {
        scheme_code: schemeCode,
      });
      return data;
    } catch (error) {
      log(`[Pulse Labs] Failed to get fund card for ${schemeCode}: ${error}`, "pulse-labs");
      return null;
    }
  }

  /**
   * Get asset categories
   */
  async getAssetCategories(): Promise<AssetCategory[]> {
    try {
      const data = await this.makeRequest<{ asset_categories: AssetCategory[] }>(
        "/mf/asset_categories"
      );
      return data.asset_categories || [];
    } catch (error) {
      log(`[Pulse Labs] Failed to get asset categories: ${error}`, "pulse-labs");
      return [];
    }
  }

  /**
   * Get asset sub-categories
   */
  async getAssetSubCategories(category?: string): Promise<AssetSubCategory[]> {
    try {
      const body: Record<string, any> = {};
      if (category) body.category = category;

      const data = await this.makeRequest<{ asset_sub_categories: AssetSubCategory[] }>(
        "/mf/asset_sub_categories",
        body
      );
      return data.asset_sub_categories || [];
    } catch (error) {
      log(`[Pulse Labs] Failed to get asset sub-categories: ${error}`, "pulse-labs");
      return [];
    }
  }

  /**
   * Get schemes by category and sub-category
   */
  async getSchemesByCategory(
    category: string,
    subCategory?: string
  ): Promise<InsertPulseLabsMutualFundScheme[]> {
    try {
      const body: Record<string, any> = {
        category,
      };
      if (subCategory) body.sub_category = subCategory;

      const data = await this.makeRequest<{ schemes: any[] }>(
        "/mf/by_category_sub_category/list",
        body
      );
      const schemes = data.schemes || [];
      return schemes.map((s) => this.transformScheme(s));
    } catch (error) {
      log(`[Pulse Labs] Failed to get schemes by category: ${error}`, "pulse-labs");
      return [];
    }
  }

  /**
   * Get fund ratings
   */
  async getFundRating(schemeCode: string): Promise<FundRating | null> {
    try {
      const data = await this.makeRequest<FundRating>("/mf/rating", {
        scheme_code: schemeCode,
      });
      return data;
    } catch (error) {
      log(`[Pulse Labs] Failed to get fund rating for ${schemeCode}: ${error}`, "pulse-labs");
      return null;
    }
  }

  /**
   * Get analytical data (returns, risk metrics, etc.)
   */
  async getAnalyticalData(schemeCode: string): Promise<AnalyticalData | null> {
    try {
      const data = await this.makeRequest<AnalyticalData>("/mf/analytical-data", {
        scheme_code: schemeCode,
      });
      return data;
    } catch (error) {
      log(`[Pulse Labs] Failed to get analytical data for ${schemeCode}: ${error}`, "pulse-labs");
      return null;
    }
  }

  /**
   * Get top charts (top performing funds)
   */
  async getTopCharts(
    category?: string,
    subCategory?: string,
    period?: string
  ): Promise<TopChartItem[]> {
    try {
      const body: Record<string, any> = {};
      if (category) body.category = category;
      if (subCategory) body.sub_category = subCategory;
      if (period) body.period = period;

      const data = await this.makeRequest<{ top_charts: TopChartItem[] }>(
        "/mf/topcharts",
        body
      );
      return data.top_charts || [];
    } catch (error) {
      log(`[Pulse Labs] Failed to get top charts: ${error}`, "pulse-labs");
      return [];
    }
  }

  /**
   * Get NFO (New Fund Offers)
   */
  async getNFO(): Promise<NFOItem[]> {
    try {
      const data = await this.makeRequest<{ nfo: NFOItem[] }>(
        "/mf/nfo"
      );
      return data.nfo || [];
    } catch (error) {
      log(`[Pulse Labs] Failed to get NFO: ${error}`, "pulse-labs");
      return [];
    }
  }
}

// Export singleton instance
export const pulseLabsService = new PulseLabsService();
