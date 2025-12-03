/**
 * FI Data Processing Service
 * 
 * Processes financial information data received from Finvu AA webhooks
 * and stores it in the database with proper deduplication using idempotency keys.
 * 
 * This service handles:
 * - Parsing raw FI data from webhook payloads
 * - Computing idempotency keys for holdings and transactions
 * - Storing data in fi_accounts, fi_holdings, and fi_transactions tables
 * - Processing different FI types (deposits, mutual funds, equities, insurance)
 */

import { createHash } from 'crypto';
import { IStorage } from '../storage';
import type { 
  AccountAggregatorService, 
  AccountData, 
  HoldingData, 
  TransactionData 
} from './accountAggregator';

interface ProcessingResult {
  success: boolean;
  batchId: string;
  accountsProcessed: number;
  holdingsProcessed: number;
  transactionsProcessed: number;
  errors: string[];
}

interface FIBatchData {
  sessionId: string;
  consentHandle: string;
  consentId: string;
  userId: string;
  fiData: any; // Raw FI data from Finvu
  status: 'READY' | 'PARTIAL' | 'DENIED' | 'EXPIRED';
}

/**
 * FI Data Processor Service
 */
export class FIDataProcessor {
  private storage: IStorage;
  private aaService: AccountAggregatorService;

  constructor(storage: IStorage, aaService: AccountAggregatorService) {
    this.storage = storage;
    this.aaService = aaService;
  }

  /**
   * Process a complete FI data batch from webhook notification
   * 
   * This is the main entry point called when Finvu sends FI data ready notification
   */
  async processFIBatch(batchData: FIBatchData): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      success: false,
      batchId: '',
      accountsProcessed: 0,
      holdingsProcessed: 0,
      transactionsProcessed: 0,
      errors: [],
    };

    console.log('[FI Processor] Processing FI batch:', {
      sessionId: batchData.sessionId,
      consentHandle: batchData.consentHandle,
      userId: batchData.userId,
    });

    try {
      // Step 1: Get consent record from database
      const consent = await this.storage.getAAConsentByHandle(batchData.consentHandle);
      
      if (!consent) {
        result.errors.push(`Consent not found for handle: ${batchData.consentHandle}`);
        return result;
      }

      // Step 2: Parse and validate FI data
      const accounts = this.parseFIData(batchData.fiData);
      
      if (accounts.length === 0) {
        result.errors.push('No account data found in FI response');
        return result;
      }

      // Step 3: Process each account
      for (const account of accounts) {
        try {
          await this.processAccount(account, consent.id, batchData.userId);
          result.accountsProcessed++;

          // Process holdings
          if (account.holdings && account.holdings.length > 0) {
            for (const holding of account.holdings) {
              try {
                await this.processHolding(holding, account.accountId, account.fiType, batchData.sessionId);
                result.holdingsProcessed++;
              } catch (holdingError: any) {
                result.errors.push(`Holding error: ${holdingError.message}`);
              }
            }
          }

          // Process transactions
          if (account.transactions && account.transactions.length > 0) {
            for (const transaction of account.transactions) {
              try {
                await this.processTransaction(transaction, account.accountId, account.fiType, batchData.sessionId);
                result.transactionsProcessed++;
              } catch (txnError: any) {
                result.errors.push(`Transaction error: ${txnError.message}`);
              }
            }
          }
        } catch (accountError: any) {
          result.errors.push(`Account error (${account.accountId}): ${accountError.message}`);
        }
      }

      // Step 4: Update batch status
      result.batchId = batchData.sessionId;
      result.success = result.errors.length === 0;

      console.log('[FI Processor] Batch processing complete:', {
        batchId: result.batchId,
        accounts: result.accountsProcessed,
        holdings: result.holdingsProcessed,
        transactions: result.transactionsProcessed,
        errors: result.errors.length,
      });

      return result;

    } catch (error: any) {
      console.error('[FI Processor] Batch processing failed:', error);
      result.errors.push(`Batch processing failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Parse raw FI data from Finvu response
   */
  private parseFIData(fiData: any): AccountData[] {
    const accounts: AccountData[] = [];

    try {
      // Handle different FI data formats from Finvu
      const fiArray = fiData.FI || fiData.fi || fiData.data || [fiData];
      
      for (const fi of Array.isArray(fiArray) ? fiArray : [fiArray]) {
        // Each FI entry can contain multiple accounts
        const accountData = fi.data?.account || fi.Account || fi.account;
        
        if (!accountData) continue;

        const accountList = Array.isArray(accountData) ? accountData : [accountData];
        
        for (const acc of accountList) {
          const account = this.parseAccountData(acc, fi.fipId || fi.FipId);
          if (account) {
            accounts.push(account);
          }
        }
      }
    } catch (error) {
      console.error('[FI Processor] Error parsing FI data:', error);
    }

    return accounts;
  }

  /**
   * Parse a single account from FI data
   */
  private parseAccountData(accountData: any, fipId: string): AccountData | null {
    try {
      const fiType = this.determineFIType(accountData, fipId);
      
      const account: AccountData = {
        accountId: accountData.maskedAccNumber || accountData.accountId || accountData.linkedAccRef,
        fipId: fipId,
        accountType: accountData.type || accountData.accountType || 'UNKNOWN',
        maskedAccountNumber: accountData.maskedAccNumber || 'XXXX',
        fiType: fiType,
        linkRefNumber: accountData.linkRefNumber,
        holdings: [],
        transactions: [],
      };

      // Parse profile
      if (accountData.Profile) {
        account.profile = accountData.Profile;
      }

      // Parse summary and balance
      if (accountData.Summary) {
        account.summary = accountData.Summary;
        const balance = accountData.Summary.currentBalance || 
                       accountData.Summary.closingBalance ||
                       accountData.Summary.balance;
        if (balance) {
          account.balance = {
            amount: parseFloat(balance),
            currency: accountData.Summary.currency || 'INR',
          };
        }
      }

      // Parse holdings based on FI type
      account.holdings = this.parseHoldingsFromAccount(accountData, fiType);
      
      // Parse transactions
      account.transactions = this.parseTransactionsFromAccount(accountData, fiType);

      return account;
    } catch (error) {
      console.error('[FI Processor] Error parsing account data:', error);
      return null;
    }
  }

  /**
   * Determine FI type from account data and FIP ID
   */
  private determineFIType(accountData: any, fipId: string): AccountData['fiType'] {
    // Check explicit fiType field
    if (accountData.fiType) {
      return this.normalizeFIType(accountData.fiType);
    }

    // Infer from account type
    const accountType = (accountData.type || accountData.accountType || '').toUpperCase();
    
    if (accountType.includes('SAVINGS') || accountType.includes('CURRENT') || accountType.includes('OVERDRAFT')) {
      return 'DEPOSIT';
    }
    if (accountType.includes('FIXED') || accountType.includes('TERM') || accountType.includes('FD')) {
      return 'TERM_DEPOSIT';
    }
    if (accountType.includes('MUTUAL') || accountType.includes('MF') || accountType.includes('SIP')) {
      return 'MUTUAL_FUNDS';
    }
    if (accountType.includes('DEMAT') || accountType.includes('EQUITY') || accountType.includes('SECURITIES')) {
      return 'EQUITIES';
    }
    if (accountType.includes('INSURANCE') || accountType.includes('POLICY')) {
      return 'INSURANCE';
    }

    // Infer from FIP ID
    const lowerFipId = (fipId || '').toLowerCase();
    if (lowerFipId.includes('cams') || lowerFipId.includes('kfintech') || lowerFipId.includes('mf')) {
      return 'MUTUAL_FUNDS';
    }
    if (lowerFipId.includes('nsdl') || lowerFipId.includes('cdsl')) {
      return 'EQUITIES';
    }
    if (lowerFipId.includes('lic') || lowerFipId.includes('insurance')) {
      return 'INSURANCE';
    }

    return 'DEPOSIT';
  }

  /**
   * Normalize FI type string to enum value
   */
  private normalizeFIType(fiType: string): AccountData['fiType'] {
    const normalized = fiType.toUpperCase().replace(/[_-]/g, '');
    
    if (normalized.includes('DEPOSIT') && !normalized.includes('TERM')) return 'DEPOSIT';
    if (normalized.includes('TERM') || normalized.includes('FIXED') || normalized.includes('FD')) return 'TERM_DEPOSIT';
    if (normalized.includes('MUTUAL') || normalized.includes('MF')) return 'MUTUAL_FUNDS';
    if (normalized.includes('EQUIT') || normalized.includes('SECURITIES') || normalized.includes('DEMAT')) return 'EQUITIES';
    if (normalized.includes('INSURANCE')) return 'INSURANCE';
    if (normalized.includes('SIP')) return 'SIP';
    
    return 'DEPOSIT';
  }

  /**
   * Parse holdings from account data based on FI type
   */
  private parseHoldingsFromAccount(accountData: any, fiType: string): HoldingData[] {
    const holdings: HoldingData[] = [];

    try {
      // Different FI types have different holding structures
      let holdingData: any[] = [];

      if (fiType === 'MUTUAL_FUNDS' || fiType === 'SIP') {
        holdingData = accountData.Transactions?.Transaction?.schemeData ||
                     accountData.Holdings?.Holding ||
                     accountData.holdings ||
                     [];
      } else if (fiType === 'EQUITIES') {
        holdingData = accountData.Holdings?.Holding ||
                     accountData.Securities?.Security ||
                     accountData.holdings ||
                     [];
      } else if (fiType === 'INSURANCE') {
        holdingData = accountData.Policies?.Policy ||
                     accountData.policies ||
                     [accountData]; // Insurance might be the account itself
      } else if (fiType === 'TERM_DEPOSIT') {
        holdingData = [accountData]; // Term deposit is the holding itself
      }

      for (const h of Array.isArray(holdingData) ? holdingData : [holdingData]) {
        const holding = this.parseHoldingByType(h, fiType);
        if (holding) {
          holdings.push(holding);
        }
      }
    } catch (error) {
      console.error('[FI Processor] Error parsing holdings:', error);
    }

    return holdings;
  }

  /**
   * Parse a single holding based on FI type
   */
  private parseHoldingByType(data: any, fiType: string): HoldingData | null {
    try {
      let holding: HoldingData;

      switch (fiType) {
        case 'MUTUAL_FUNDS':
        case 'SIP':
          holding = {
            instrumentName: data.schemeName || data.issuerName || data.name || 'Unknown Scheme',
            instrumentId: data.isin || data.schemeCode || data.amfi,
            quantity: parseFloat(data.units || data.holding || '0'),
            currentValue: parseFloat(data.currentValue || data.closingValue || '0'),
            investedAmount: parseFloat(data.costValue || data.investedValue || '0'),
            averagePrice: parseFloat(data.nav || data.purchaseNav || '0'),
            asOfDate: new Date(data.asOfDate || data.navDate || Date.now()),
            holdingDetails: {
              ...data,
              fiType,
              folioNo: data.folioNo,
              amcName: data.amc || data.amcName,
              schemeType: data.schemeType || data.category,
            },
          };
          break;

        case 'EQUITIES':
          holding = {
            instrumentName: data.companyName || data.issuerName || data.name || 'Unknown Stock',
            instrumentId: data.isin || data.symbol || data.scripCode,
            quantity: parseFloat(data.quantity || data.freeBalance || data.holding || '0'),
            currentValue: parseFloat(data.currentValue || data.closingValue || '0'),
            investedAmount: parseFloat(data.costValue || data.investedValue || '0'),
            averagePrice: parseFloat(data.averagePrice || data.purchasePrice || '0'),
            asOfDate: new Date(data.asOfDate || Date.now()),
            holdingDetails: {
              ...data,
              fiType,
              exchange: data.exchange,
              sector: data.sector || data.industry,
              dpId: data.dpId,
              clientId: data.clientId,
            },
          };
          break;

        case 'INSURANCE':
          holding = {
            instrumentName: data.policyName || data.planName || data.productName || 'Unknown Policy',
            instrumentId: data.policyNumber || data.policyNo,
            quantity: 1,
            currentValue: parseFloat(data.sumAssured || data.maturityValue || '0'),
            investedAmount: parseFloat(data.premium || data.totalPremiumPaid || '0'),
            averagePrice: parseFloat(data.premium || '0'),
            asOfDate: new Date(data.asOfDate || Date.now()),
            holdingDetails: {
              ...data,
              fiType,
              policyType: data.policyType || data.type,
              policyStatus: data.policyStatus || data.status,
              maturityDate: data.maturityDate,
              premiumFrequency: data.premiumFrequency || data.mode,
              coverageAmount: data.coverageAmount || data.sumAssured,
              nominees: data.nominees,
            },
          };
          break;

        case 'TERM_DEPOSIT':
          holding = {
            instrumentName: `${data.type || 'Fixed'} Deposit`,
            instrumentId: data.accountNumber || data.fdNumber || data.maskedAccNumber,
            quantity: 1,
            currentValue: parseFloat(data.currentValue || data.maturityAmount || '0'),
            investedAmount: parseFloat(data.openingBalance || data.principal || '0'),
            averagePrice: 0,
            asOfDate: new Date(data.asOfDate || Date.now()),
            holdingDetails: {
              ...data,
              fiType,
              interestRate: data.interestRate || data.rate,
              maturityDate: data.maturityDate,
              tenureMonths: data.tenureMonths || data.tenure,
              interestPayout: data.interestPayoutFrequency || data.payoutFrequency,
            },
          };
          break;

        default:
          holding = {
            instrumentName: data.name || data.accountType || 'Unknown',
            instrumentId: data.id || data.accountNumber,
            quantity: parseFloat(data.balance || data.quantity || '1'),
            currentValue: parseFloat(data.currentValue || data.balance || '0'),
            investedAmount: 0,
            averagePrice: 0,
            asOfDate: new Date(data.asOfDate || Date.now()),
            holdingDetails: { ...data, fiType },
          };
      }

      return holding;
    } catch (error) {
      console.error('[FI Processor] Error parsing holding:', error);
      return null;
    }
  }

  /**
   * Parse transactions from account data
   */
  private parseTransactionsFromAccount(accountData: any, fiType: string): TransactionData[] {
    const transactions: TransactionData[] = [];

    try {
      let txnData = accountData.Transactions?.Transaction ||
                   accountData.transactions ||
                   [];

      for (const t of Array.isArray(txnData) ? txnData : [txnData]) {
        const txn = this.parseTransactionByType(t, fiType);
        if (txn) {
          transactions.push(txn);
        }
      }
    } catch (error) {
      console.error('[FI Processor] Error parsing transactions:', error);
    }

    return transactions;
  }

  /**
   * Parse a single transaction based on FI type
   */
  private parseTransactionByType(data: any, fiType: string): TransactionData | null {
    try {
      const txn: TransactionData = {
        transactionId: data.txnId || data.transactionId || data.reference,
        transactionType: this.normalizeTransactionType(data.type || data.transactionType || 'UNKNOWN'),
        amount: parseFloat(data.amount || data.transactionAmount || '0'),
        transactionDate: new Date(data.transactionTimestamp || data.transactionDate || data.valueDate || Date.now()),
        narration: data.narration || data.description || data.remarks,
        reference: data.reference || data.txnId,
        transactionDetails: {
          ...data,
          fiType,
        },
      };

      // Add type-specific details
      if (fiType === 'MUTUAL_FUNDS' || fiType === 'SIP') {
        txn.transactionDetails = {
          ...txn.transactionDetails,
          units: data.units,
          nav: data.nav,
          schemeName: data.schemeName,
          folioNo: data.folioNo,
        };
      } else if (fiType === 'EQUITIES') {
        txn.transactionDetails = {
          ...txn.transactionDetails,
          quantity: data.quantity,
          price: data.price,
          exchange: data.exchange,
          symbol: data.symbol,
        };
      }

      return txn;
    } catch (error) {
      console.error('[FI Processor] Error parsing transaction:', error);
      return null;
    }
  }

  /**
   * Normalize transaction type to standard format
   */
  private normalizeTransactionType(type: string): string {
    const normalized = type.toUpperCase();
    
    if (normalized.includes('CREDIT') || normalized.includes('DEPOSIT') || normalized.includes('PURCHASE')) {
      return 'CREDIT';
    }
    if (normalized.includes('DEBIT') || normalized.includes('WITHDRAW') || normalized.includes('REDEMPTION')) {
      return 'DEBIT';
    }
    if (normalized.includes('BUY')) return 'BUY';
    if (normalized.includes('SELL')) return 'SELL';
    if (normalized.includes('DIVIDEND')) return 'DIVIDEND';
    if (normalized.includes('INTEREST')) return 'INTEREST';
    if (normalized.includes('SIP')) return 'SIP';
    if (normalized.includes('SWITCH')) return 'SWITCH';
    
    return normalized;
  }

  /**
   * Process and store an account in the database
   */
  private async processAccount(
    account: AccountData,
    consentId: string,
    userId: string
  ): Promise<string> {
    console.log('[FI Processor] Processing account:', {
      accountId: account.accountId,
      fiType: account.fiType,
      fipId: account.fipId,
    });

    // Create or update FI account record
    const fiAccount = await this.storage.upsertFIAccount({
      userId,
      consentId,
      fiType: account.fiType,
      accountId: account.accountId,
      maskedAccountNumber: account.maskedAccountNumber,
      fipId: account.fipId,
      accountType: account.accountType,
      accountStatus: 'ACTIVE',
      metadata: {
        profile: account.profile,
        summary: account.summary,
        balance: account.balance,
        linkRefNumber: account.linkRefNumber,
      },
    });

    return fiAccount.id;
  }

  /**
   * Process and store a holding with idempotency
   */
  private async processHolding(
    holding: HoldingData,
    accountId: string,
    fiType: string,
    batchId: string
  ): Promise<void> {
    // Compute idempotency key
    const idempotencyKey = this.aaService.computeHoldingIdempotencyKey(
      accountId,
      holding.instrumentId,
      holding.asOfDate,
      holding.holdingDetails
    );

    console.log('[FI Processor] Processing holding:', {
      accountId,
      instrumentName: holding.instrumentName,
      idempotencyKey: idempotencyKey.substring(0, 16) + '...',
    });

    // Upsert holding with idempotency key
    await this.storage.upsertFIHolding({
      accountId,
      batchId,
      fiType: fiType as any,
      instrumentName: holding.instrumentName,
      instrumentId: holding.instrumentId,
      quantity: holding.quantity.toString(),
      averagePrice: holding.averagePrice?.toString(),
      currentValue: holding.currentValue.toString(),
      investedAmount: holding.investedAmount?.toString(),
      holdingDetails: holding.holdingDetails,
      idempotencyKey,
      asOfDate: holding.asOfDate,
    });
  }

  /**
   * Process and store a transaction with idempotency
   */
  private async processTransaction(
    transaction: TransactionData,
    accountId: string,
    fiType: string,
    batchId: string
  ): Promise<void> {
    // Compute idempotency key
    const idempotencyKey = this.aaService.computeTransactionIdempotencyKey(
      accountId,
      transaction.transactionId,
      transaction.transactionDate,
      transaction.amount,
      transaction.transactionDetails
    );

    console.log('[FI Processor] Processing transaction:', {
      accountId,
      transactionId: transaction.transactionId,
      idempotencyKey: idempotencyKey.substring(0, 16) + '...',
    });

    // Upsert transaction with idempotency key
    await this.storage.upsertFITransaction({
      accountId,
      batchId,
      fiType: fiType as any,
      transactionId: transaction.transactionId,
      transactionType: transaction.transactionType,
      amount: transaction.amount.toString(),
      transactionDate: transaction.transactionDate,
      narration: transaction.narration,
      reference: transaction.reference,
      transactionDetails: transaction.transactionDetails,
      idempotencyKey,
    });
  }
}

/**
 * Create FI Data Processor instance
 */
export function createFIDataProcessor(
  storage: IStorage,
  aaService: AccountAggregatorService
): FIDataProcessor {
  return new FIDataProcessor(storage, aaService);
}

export type { ProcessingResult, FIBatchData };
