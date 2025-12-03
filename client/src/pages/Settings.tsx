import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Shield,
  Bell,
  Database,
  Download,
  Trash2,
  Check,
  AlertCircle,
  Link as LinkIcon,
  Unlink
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Settings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("account");

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/users/demo-user"],
  });

  const { data: aaConsents = [], isLoading: consentsLoading } = useQuery({
    queryKey: ["/api/users/demo-user/aa-consents"],
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and preferences
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="account" data-testid="tab-account">
            <User className="w-4 h-4 mr-2" />
            Account
          </TabsTrigger>
          <TabsTrigger value="security" data-testid="tab-security">
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="aa-settings" data-testid="tab-aa">
            <Database className="w-4 h-4 mr-2" />
            Account Aggregator
          </TabsTrigger>
          <TabsTrigger value="data" data-testid="tab-data">
            <Download className="w-4 h-4 mr-2" />
            Data & Privacy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-4">
          <AccountSettings user={user} isLoading={userLoading} />
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <SecuritySettings />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="aa-settings" className="space-y-4">
          <AASettings consents={aaConsents} isLoading={consentsLoading} />
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <DataPrivacySettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AccountSettings({ user, isLoading }: any) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
  });

  // Sync form data when user data loads
  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || "",
        email: user.email || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  const updateProfile = useMutation({
    mutationFn: async (data: any) => {
      if (!user?.id) {
        throw new Error("User ID is required");
      }
      return apiRequest("PATCH", `/api/users/${user.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/demo-user"] });
      toast({
        title: "Profile Updated",
        description: "Your account information has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User data not loaded yet.",
        variant: "destructive",
      });
      return;
    }
    updateProfile.mutate(formData);
  };

  if (isLoading) {
    return <Card><CardContent className="p-6">Loading...</CardContent></Card>;
  }

  if (!user) {
    return <Card><CardContent className="p-6">User not found</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Information</CardTitle>
        <CardDescription>
          Update your personal information and contact details
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              data-testid="input-fullname"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="Enter your full name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              data-testid="input-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="your.email@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              data-testid="input-phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+91 98765 43210"
            />
          </div>

          <Button
            type="submit"
            data-testid="button-save-profile"
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SecuritySettings() {
  const { toast } = useToast();
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();

    if (passwords.new !== passwords.confirm) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your new passwords match.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Password Updated",
      description: "Your password has been changed successfully.",
    });
    setPasswords({ current: "", new: "", confirm: "" });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                data-testid="input-current-password"
                type="password"
                value={passwords.current}
                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                placeholder="Enter current password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                data-testid="input-new-password"
                type="password"
                value={passwords.new}
                onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                placeholder="Enter new password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                data-testid="input-confirm-password"
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                placeholder="Confirm new password"
              />
            </div>

            <Button type="submit" data-testid="button-change-password">
              Change Password
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="font-medium">Enable 2FA</div>
              <div className="text-sm text-muted-foreground">
                Require a verification code in addition to your password
              </div>
            </div>
            <Switch
              data-testid="switch-2fa"
              checked={twoFactorEnabled}
              onCheckedChange={(checked) => {
                setTwoFactorEnabled(checked);
                toast({
                  title: checked ? "2FA Enabled" : "2FA Disabled",
                  description: checked
                    ? "Two-factor authentication has been enabled for your account."
                    : "Two-factor authentication has been disabled.",
                });
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    emailTransactions: true,
    emailRecommendations: true,
    emailWeeklyReport: false,
    smsTransactions: true,
    smsAlerts: false,
    pushNotifications: true,
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings({ ...settings, [key]: !settings[key] });
    toast({
      title: "Preferences Updated",
      description: "Your notification preferences have been saved.",
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>
            Manage what emails you receive from us
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="font-medium">Transaction Alerts</div>
              <div className="text-sm text-muted-foreground">
                Get notified when transactions occur in your portfolio
              </div>
            </div>
            <Switch
              data-testid="switch-email-transactions"
              checked={settings.emailTransactions}
              onCheckedChange={() => handleToggle("emailTransactions")}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="font-medium">AI Recommendations</div>
              <div className="text-sm text-muted-foreground">
                Receive portfolio recommendations from RuDo AI
              </div>
            </div>
            <Switch
              data-testid="switch-email-recommendations"
              checked={settings.emailRecommendations}
              onCheckedChange={() => handleToggle("emailRecommendations")}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="font-medium">Weekly Portfolio Report</div>
              <div className="text-sm text-muted-foreground">
                Summary of your portfolio performance every week
              </div>
            </div>
            <Switch
              data-testid="switch-email-weekly"
              checked={settings.emailWeeklyReport}
              onCheckedChange={() => handleToggle("emailWeeklyReport")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SMS Notifications</CardTitle>
          <CardDescription>
            Control SMS alerts to your registered mobile number
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="font-medium">Transaction SMS</div>
              <div className="text-sm text-muted-foreground">
                Instant SMS for all portfolio transactions
              </div>
            </div>
            <Switch
              data-testid="switch-sms-transactions"
              checked={settings.smsTransactions}
              onCheckedChange={() => handleToggle("smsTransactions")}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="font-medium">Critical Alerts</div>
              <div className="text-sm text-muted-foreground">
                Important security and account alerts via SMS
              </div>
            </div>
            <Switch
              data-testid="switch-sms-alerts"
              checked={settings.smsAlerts}
              onCheckedChange={() => handleToggle("smsAlerts")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Push Notifications</CardTitle>
          <CardDescription>
            Notifications on your mobile app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="font-medium">Enable Push Notifications</div>
              <div className="text-sm text-muted-foreground">
                Real-time updates and alerts on your mobile device
              </div>
            </div>
            <Switch
              data-testid="switch-push-notifications"
              checked={settings.pushNotifications}
              onCheckedChange={() => handleToggle("pushNotifications")}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AASettings({ consents, isLoading }: any) {
  const { toast } = useToast();

  const revokeConsent = useMutation({
    mutationFn: async (consentId: string) => {
      return apiRequest("PATCH", `/api/aa-consents/${consentId}`, {
        status: "REVOKED",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/demo-user/aa-consents"] });
      toast({
        title: "Consent Revoked",
        description: "Account Aggregator consent has been revoked successfully.",
      });
    },
  });

  if (isLoading) {
    return <Card><CardContent className="p-6">Loading...</CardContent></Card>;
  }

  const activeConsent = consents.find((c: any) => c.status === "ACTIVE");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Account Aggregator Integration</CardTitle>
          <CardDescription>
            Manage your financial data sharing through India's Account Aggregator framework
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeConsent ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-md border bg-muted/50">
                <Check className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <div className="font-medium">Account Aggregator Connected</div>
                  <div className="text-sm text-muted-foreground">
                    Your financial accounts are securely linked through AA framework
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="secondary" data-testid="badge-consent-status">
                      Status: {activeConsent.status}
                    </Badge>
                    <Badge variant="outline">
                      FIU ID: {activeConsent.fiuId}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-medium">Linked Accounts</div>
                {activeConsent.accountsLinked?.map((account: string, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-md border"
                    data-testid={`linked-account-${index}`}
                  >
                    <div className="flex items-center gap-3">
                      <LinkIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-mono">{account}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">Active</Badge>
                  </div>
                ))}
              </div>

              <div className="pt-4 space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Consent Expiry:</span>{" "}
                  <span className="text-muted-foreground">
                    {new Date(activeConsent.consentExpiry).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Data Frequency:</span>{" "}
                  <span className="text-muted-foreground">{activeConsent.frequency}</span>
                </div>
              </div>

              <Separator />

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    data-testid="button-revoke-consent"
                  >
                    <Unlink className="w-4 h-4 mr-2" />
                    Revoke Consent
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Revoke AA Consent?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will disconnect your financial accounts and stop automatic data syncing.
                      You can always reconnect later.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => revokeConsent.mutate(activeConsent.id)}
                    >
                      Revoke
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (
            <div className="text-center py-8 space-y-4">
              <div className="flex justify-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground" />
              </div>
              <div>
                <div className="font-medium">No Active Consent</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Connect your financial accounts through Account Aggregator to automatically sync your portfolio
                </p>
              </div>
              <Button data-testid="button-setup-aa">
                <Database className="w-4 h-4 mr-2" />
                Setup Account Aggregator
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How Account Aggregator Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Account Aggregator is a secure framework regulated by RBI that allows you to share
            your financial data with consent.
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Your data is encrypted and securely transmitted</li>
            <li>You control what data is shared and for how long</li>
            <li>Consent can be revoked anytime</li>
            <li>Automatic portfolio updates from your bank and demat accounts</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function DataPrivacySettings() {
  const { toast } = useToast();

  const handleExportData = () => {
    toast({
      title: "Export Started",
      description: "Your data export is being prepared. You'll receive an email shortly.",
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Export Your Data</CardTitle>
          <CardDescription>
            Download a copy of all your portfolio and transaction data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You can request a complete export of your data including holdings, transactions,
            recommendations, and account information in JSON or CSV format.
          </p>
          <Button
            data-testid="button-export-data"
            onClick={handleExportData}
          >
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions that affect your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="font-medium">Delete Account</div>
            <p className="text-sm text-muted-foreground">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" data-testid="button-delete-account">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account,
                  all portfolios, holdings, and transaction history from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => {
                    toast({
                      title: "Account Deletion Initiated",
                      description: "Your account deletion request has been received.",
                      variant: "destructive",
                    });
                  }}
                >
                  Delete Account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
