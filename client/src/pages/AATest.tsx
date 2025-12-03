import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, XCircle, Loader2, RefreshCw, Search, FileCheck, Database, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface TestResult {
  status: string;
  message: string;
  environment: string;
  fiuId: string;
  baseUrl: string;
  credentialsConfigured: {
    fiuId: boolean;
    baseUrl: boolean;
    channelId: boolean;
    channelPassword: boolean;
  };
  timestamp: string;
}

export default function AATest() {
  const { data, isLoading, error, refetch } = useQuery<TestResult>({
    queryKey: ['/api/account-aggregator/test'],
  });

  const allConfigured = data ? Object.values(data.credentialsConfigured).every(v => v === true) : false;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">FINVU Account Aggregator Integration Test</h1>
          <p className="text-muted-foreground mt-2">
            Test and verify FINVU API integration, consent flows, and data fetching
          </p>
        </div>

        {/* Configuration Status Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Configuration Status</CardTitle>
              <CardDescription>Current FINVU environment and credentials</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              data-testid="button-refresh-test"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {error && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 text-destructive">
                <XCircle className="h-5 w-5" />
                <span>Error loading test results: {(error as Error).message}</span>
              </div>
            )}

            {data && (
              <div className="space-y-6">
                {/* Overall Status */}
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <h3 className="font-semibold">Integration Status</h3>
                    <p className="text-sm text-muted-foreground">
                      {allConfigured ? 'All credentials configured' : 'Missing credentials'}
                    </p>
                  </div>
                  {allConfigured ? (
                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="h-4 w-4 mr-1" />
                      Incomplete
                    </Badge>
                  )}
                </div>

                {/* Environment Details */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Environment</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted/50">
                      <span className="text-sm text-muted-foreground">Environment</span>
                      <span className="font-mono font-semibold">{data.environment}</span>
                    </div>
                    <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted/50">
                      <span className="text-sm text-muted-foreground">FIU ID</span>
                      <span className="font-mono text-sm">{data.fiuId}</span>
                    </div>
                    <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted/50 md:col-span-2">
                      <span className="text-sm text-muted-foreground">Base URL</span>
                      <span className="font-mono text-sm truncate">{data.baseUrl}</span>
                    </div>
                  </div>
                </div>

                {/* Credentials Checklist */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Credentials</h3>
                  <div className="space-y-2">
                    {Object.entries(data.credentialsConfigured).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between p-3 rounded-lg border"
                        data-testid={`credential-${key}`}
                      >
                        <span className="text-sm font-medium capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        {value ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Timestamp */}
                <div className="text-xs text-muted-foreground text-center">
                  Last checked: {new Date(data.timestamp).toLocaleString()}
                </div>

                {/* Next Steps */}
                {allConfigured && (
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                    <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                      ✅ Ready for Testing
                    </h4>
                    <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                      <li>• Institution search API ready</li>
                      <li>• Consent creation and management enabled</li>
                      <li>• Account discovery flow active</li>
                      <li>• FI data fetching configured</li>
                      <li>• Webhook endpoints available</li>
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* API Testing Tabs */}
        {data && allConfigured && (
          <Tabs defaultValue="institutions" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="institutions">
                <Search className="h-4 w-4 mr-2" />
                Institutions
              </TabsTrigger>
              <TabsTrigger value="consent">
                <FileCheck className="h-4 w-4 mr-2" />
                Consent
              </TabsTrigger>
              <TabsTrigger value="discovery">
                <Database className="h-4 w-4 mr-2" />
                Discovery
              </TabsTrigger>
              <TabsTrigger value="fidata">
                <Database className="h-4 w-4 mr-2" />
                FI Data
              </TabsTrigger>
              <TabsTrigger value="webhooks">
                <Bell className="h-4 w-4 mr-2" />
                Webhooks
              </TabsTrigger>
            </TabsList>

            <TabsContent value="institutions">
              <Card>
                <CardHeader>
                  <CardTitle>Institution Search</CardTitle>
                  <CardDescription>Search for banks, AMCs, brokers, and insurers</CardDescription>
                </CardHeader>
                <CardContent>
                  <InstitutionSearchTest />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="consent">
              <Card>
                <CardHeader>
                  <CardTitle>Consent Management</CardTitle>
                  <CardDescription>Create and manage AA consent requests</CardDescription>
                </CardHeader>
                <CardContent>
                  <ConsentTest />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="discovery">
              <Card>
                <CardHeader>
                  <CardTitle>Account Discovery</CardTitle>
                  <CardDescription>Discover accounts at financial institutions</CardDescription>
                </CardHeader>
                <CardContent>
                  <AccountDiscoveryTest />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="fidata">
              <Card>
                <CardHeader>
                  <CardTitle>FI Data Fetching</CardTitle>
                  <CardDescription>Fetch financial data from linked accounts</CardDescription>
                </CardHeader>
                <CardContent>
                  <FIDataTest />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="webhooks">
              <Card>
                <CardHeader>
                  <CardTitle>Webhook Endpoints</CardTitle>
                  <CardDescription>Test webhook handlers for consent and FI notifications</CardDescription>
                </CardHeader>
                <CardContent>
                  <WebhookTest />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

function InstitutionSearchTest() {
  const [searchQuery, setSearchQuery] = useState('HDFC');
  const [shouldSearch, setShouldSearch] = useState(false);
  
  const { data: institutions, isLoading, refetch } = useQuery({
    queryKey: ['/api/account-aggregator/institutions', searchQuery],
    queryFn: async () => {
      const response = await fetch(`/api/account-aggregator/institutions?query=${searchQuery}`);
      if (!response.ok) throw new Error('Failed to search institutions');
      return response.json();
    },
    enabled: shouldSearch,
  });

  const handleSearch = () => {
    setShouldSearch(true);
    refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search institutions..."
          className="flex-1 px-4 py-2 rounded-md border bg-background"
          data-testid="input-institution-search"
        />
        <Button 
          variant="default" 
          onClick={handleSearch}
          disabled={isLoading}
          data-testid="button-search-institutions"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {institutions && institutions.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Found {institutions.length} institutions
          </p>
          <div className="grid gap-2">
            {institutions.map((inst: any) => (
              <div
                key={inst.id}
                className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
                data-testid={`institution-${inst.id}`}
              >
                <div>
                  <div className="font-medium">{inst.name}</div>
                  <div className="text-sm text-muted-foreground">{inst.description}</div>
                </div>
                <Badge variant="outline" className="capitalize">
                  {inst.type}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {institutions && institutions.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No institutions found for "{searchQuery}"
        </p>
      )}
    </div>
  );
}

function ConsentTest() {
  const { toast } = useToast();
  const [consentResult, setConsentResult] = useState<any>(null);

  const createConsentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/account-aggregator/consent', {
        userId: 'demo-user',
        purpose: 'Wealth Management and Investment Tracking',
        fiTypes: ['DEPOSIT', 'MUTUAL_FUNDS', 'SECURITIES'],
        dataRangeMonths: 12,
        validityMonths: 12,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setConsentResult(data);
      toast({
        title: 'Consent Created',
        description: `Consent ID: ${data.consentId}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <Button
          onClick={() => createConsentMutation.mutate()}
          disabled={createConsentMutation.isPending}
          data-testid="button-create-consent"
        >
          {createConsentMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Create Test Consent
        </Button>
      </div>

      {consentResult && (
        <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
          <h4 className="font-semibold">Consent Created</h4>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Consent ID:</span>
              <span className="font-mono">{consentResult.consentId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <Badge>{consentResult.status}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valid Until:</span>
              <span>{new Date(consentResult.consentExpiry).toLocaleDateString()}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground italic">
            {consentResult.message}
          </p>
        </div>
      )}
    </div>
  );
}

function AccountDiscoveryTest() {
  const [selectedInstitution, setSelectedInstitution] = useState('amc-hdfc');
  
  const { data: accounts, isLoading } = useQuery({
    queryKey: ['/api/account-aggregator/institutions', selectedInstitution, 'discover'],
    queryFn: async () => {
      const response = await fetch(`/api/account-aggregator/institutions/${selectedInstitution}/discover?userId=demo-user`);
      if (!response.ok) throw new Error('Failed to discover accounts');
      return response.json();
    },
  });

  const institutions = [
    { id: 'amc-hdfc', name: 'HDFC AMC' },
    { id: 'broker-zerodha', name: 'Zerodha' },
    { id: 'bank-hdfc', name: 'HDFC Bank' },
    { id: 'ins-lic', name: 'LIC' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <select
          value={selectedInstitution}
          onChange={(e) => setSelectedInstitution(e.target.value)}
          className="flex-1 px-4 py-2 rounded-md border bg-background"
          data-testid="select-institution"
        >
          {institutions.map((inst) => (
            <option key={inst.id} value={inst.id}>
              {inst.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {accounts && accounts.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Found {accounts.length} accounts
          </p>
          <div className="grid gap-2">
            {accounts.map((account: any) => (
              <div
                key={account.accountId}
                className="flex items-center justify-between p-3 rounded-lg border"
                data-testid={`account-${account.accountId}`}
              >
                <div>
                  <div className="font-medium">{account.accountName}</div>
                  <div className="text-sm text-muted-foreground">
                    {account.accountNumber} • {account.accountType}
                  </div>
                </div>
                <Badge variant="outline">
                  {account.isLinked ? 'Linked' : 'Not Linked'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {accounts && accounts.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No accounts found for this institution
        </p>
      )}
    </div>
  );
}

function FIDataTest() {
  const { toast } = useToast();
  const [consentId, setConsentId] = useState('');
  const [fiDataResult, setFiDataResult] = useState<any>(null);

  const fetchDataMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/account-aggregator/fi-data', {
        consentId: consentId || 'mock-consent-123',
        dataRangeMonths: 12,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setFiDataResult(data);
      toast({
        title: 'FI Data Fetched',
        description: `Retrieved ${data.accountsCount} accounts`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input
          type="text"
          value={consentId}
          onChange={(e) => setConsentId(e.target.value)}
          placeholder="Consent ID (leave empty for mock data)"
          className="flex-1 px-4 py-2 rounded-md border bg-background"
          data-testid="input-consent-id"
        />
        <Button
          onClick={() => fetchDataMutation.mutate()}
          disabled={fetchDataMutation.isPending}
          data-testid="button-fetch-fi-data"
        >
          {fetchDataMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Fetch FI Data
        </Button>
      </div>

      {fiDataResult && (
        <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
          <h4 className="font-semibold">FI Data Retrieved</h4>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Accounts:</span>
              <span className="font-semibold">{fiDataResult.accountsCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Consent ID:</span>
              <span className="font-mono text-xs">{fiDataResult.consentId}</span>
            </div>
          </div>
          {fiDataResult.accounts && fiDataResult.accounts.length > 0 && (
            <div className="mt-3 space-y-2">
              {fiDataResult.accounts.map((account: any, idx: number) => (
                <div key={idx} className="p-3 rounded-lg border bg-background">
                  <div className="font-medium">{account.accountType}</div>
                  <div className="text-sm text-muted-foreground">
                    {account.maskedAccountNumber} • {account.fiType}
                  </div>
                  {account.balance && (
                    <div className="text-sm mt-1">
                      Balance: ₹{account.balance.amount.toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WebhookTest() {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="p-4 rounded-lg border">
          <h4 className="font-semibold mb-2">Consent Notification Webhook</h4>
          <p className="text-sm text-muted-foreground mb-2">
            POST /api/aa/consent/notification
          </p>
          <code className="block p-3 rounded-md bg-muted text-xs overflow-x-auto">
            {JSON.stringify({ consentId: 'CI_ABC123', status: 'ACTIVE' }, null, 2)}
          </code>
        </div>

        <div className="p-4 rounded-lg border">
          <h4 className="font-semibold mb-2">FI Data Notification Webhook</h4>
          <p className="text-sm text-muted-foreground mb-2">
            POST /api/aa/fi/notification
          </p>
          <code className="block p-3 rounded-md bg-muted text-xs overflow-x-auto">
            {JSON.stringify({ sessionId: 'SESSION_XYZ', status: 'READY' }, null, 2)}
          </code>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          ℹ️ These webhook endpoints are ready to receive notifications from FINVU. 
          Configure these URLs in your FINVU dashboard to receive real-time updates.
        </p>
      </div>
    </div>
  );
}
