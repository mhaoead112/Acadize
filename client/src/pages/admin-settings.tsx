import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { apiEndpoint } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  Settings, Globe, Mail, Bell, Lock, Database, 
  Shield, DollarSign, Palette, Save, AlertTriangle, RefreshCw
} from "lucide-react";

export default function AdminSettings() {
  const { t } = useTranslation('admin');
  const { toast } = useToast();
  const { token } = useAuth();
  const queryClient = useQueryClient();

  // Fetch settings from API
  const { data: settingsData, isLoading, refetch } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const response = await fetch(apiEndpoint('/api/admin/settings'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch settings');
      return response.json();
    },
    enabled: !!token
  });

  const [generalSettings, setGeneralSettings] = useState({
    siteName: "EduVerse",
    siteDescription: "A modern learning management system",
    timezone: "UTC",
    dateFormat: "YYYY-MM-DD",
    timeFormat: "24h",
  });

  const [securitySettings, setSecuritySettings] = useState({
    allowRegistration: true,
    requireEmailVerification: false,
    sessionTimeout: 120,
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    passwordMinLength: 6,
  });

  const [featureSettings, setFeatureSettings] = useState({
    aiStudyBuddy: true,
    studyGroups: true,
    videoConferencing: false,
    reportCards: true,
    parentPortal: true,
    notifications: true,
    darkMode: true,
  });

  const [emailSettings, setEmailSettings] = useState({
    smtpEnabled: false,
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    fromEmail: "noreply@eduverse.com",
    fromName: "EduVerse",
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    assignmentReminders: true,
    gradeNotifications: true,
    announcementNotifications: true,
    messageNotifications: true,
    reminderHoursBefore: 24,
  });

  const [maintenanceSettings, setMaintenanceSettings] = useState({
    maintenanceMode: false,
    maintenanceMessage: "The system is currently under maintenance. Please try again later.",
    allowAdminAccess: true,
  });

  const [paymentSettings, setPaymentSettings] = useState({
    currency: "USD",
    paymentGateway: "stripe",
    stripePublicKey: "",
    stripeSecretKey: "",
    commissionRate: "10",
    minimumPayout: "50",
  });

  const [localeSettings, setLocaleSettings] = useState({ defaultLocale: "en", enabledLocales: ["en"] as string[] });

  const { data: localeData, refetch: refetchLocale } = useQuery({
    queryKey: ['admin-settings-locale'],
    queryFn: async () => {
      const response = await fetch(apiEndpoint('/api/admin/settings/locale'), {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch locale settings');
      return response.json();
    },
    enabled: !!token
  });

  useEffect(() => {
    if (localeData) {
      setLocaleSettings({
        defaultLocale: localeData.defaultLocale ?? 'en',
        enabledLocales: Array.isArray(localeData.enabledLocales) ? localeData.enabledLocales : ['en'],
      });
    }
  }, [localeData]);

  const localeSaveMutation = useMutation({
    mutationFn: async (payload: { defaultLocale?: string; enabledLocales?: string[] }) => {
      const response = await fetch(apiEndpoint('/api/admin/settings/locale'), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update locale settings');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: t('toast.localeSaved') });
      refetchLocale();
      queryClient.invalidateQueries({ queryKey: ['admin-settings-locale'] });
    },
    onError: (e: Error) => toast({ title: e.message, variant: 'destructive' }),
  });

  // Update local state when settings are fetched
  useEffect(() => {
    if (settingsData?.settings) {
      const s = settingsData.settings;
      if (s.general) setGeneralSettings(prev => ({ ...prev, ...s.general }));
      if (s.security) setSecuritySettings(prev => ({ ...prev, ...s.security }));
      if (s.features) setFeatureSettings(prev => ({ ...prev, ...s.features }));
      if (s.email) setEmailSettings(prev => ({ ...prev, ...s.email }));
      if (s.notifications) setNotificationSettings(prev => ({ ...prev, ...s.notifications }));
      if (s.maintenance) setMaintenanceSettings(prev => ({ ...prev, ...s.maintenance }));
      if (s.payment) setPaymentSettings(prev => ({ ...prev, ...s.payment }));
    }
  }, [settingsData]);

  const saveSettingsMutation = useMutation({
    mutationFn: async ({ category, data }: { category: string; data: any }) => {
      const response = await fetch(apiEndpoint(`/api/admin/settings/${category}`), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to save settings');
      return response.json();
    },
    onSuccess: (data, variables) => {
      const category = variables.category.charAt(0).toUpperCase() + variables.category.slice(1);
      toast({
        title: t('common:toast.success'),
        description: t('toast.categorySettingsSaved', { category }),
      });
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    },
    onError: (error) => {
      toast({
        title: t('common:toast.error'),
        description: error instanceof Error ? error.message : t('common:toast.failed'),
        variant: "destructive",
      });
    },
  });

  const resetSettingsMutation = useMutation({
    mutationFn: async (category?: string) => {
      const response = await fetch(apiEndpoint('/api/admin/settings/reset'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ category })
      });
      if (!response.ok) throw new Error('Failed to reset settings');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('common:toast.success'),
        description: t('toast.settingsReset'),
      });
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    },
    onError: () => {
      toast({
        title: t('common:toast.error'),
        description: t('toast.settingsResetError'),
        variant: "destructive",
      });
    },
  });

  const handleSaveGeneral = () => {
    saveSettingsMutation.mutate({ category: "general", data: generalSettings });
  };

  const handleSaveEmail = () => {
    saveSettingsMutation.mutate({ category: "email", data: emailSettings });
  };

  const handleSaveNotifications = () => {
    saveSettingsMutation.mutate({ category: "notifications", data: notificationSettings });
  };

  const handleSaveSecurity = () => {
    saveSettingsMutation.mutate({ category: "security", data: securitySettings });
  };

  const handleSaveFeatures = () => {
    saveSettingsMutation.mutate({ category: "features", data: featureSettings });
  };

  const handleSaveMaintenance = () => {
    saveSettingsMutation.mutate({ category: "maintenance", data: maintenanceSettings });
  };

  const handleSavePayment = () => {
    saveSettingsMutation.mutate({ category: "payment", data: paymentSettings });
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('systemSettings')} ⚙️
          </h1>
          <p className="text-gray-600">
            Configure platform settings and preferences
          </p>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">
              <Globe className="h-4 w-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="payment">
              <DollarSign className="h-4 w-4 mr-2" />
              Payment
            </TabsTrigger>
            <TabsTrigger value="locale">
              <Globe className="h-4 w-4 mr-2" />
              Language
            </TabsTrigger>
          </TabsList>

          {/* Locale (i18n) Settings */}
          <TabsContent value="locale">
            <Card>
              <CardHeader>
                <CardTitle>Language (i18n)</CardTitle>
                <CardDescription>Default language and enabled languages for this organization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Default language</Label>
                  <Select
                    value={localeSettings.defaultLocale}
                    onValueChange={(v) => setLocaleSettings((s) => ({ ...s, defaultLocale: v }))}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">العربية (Arabic)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Enabled languages</Label>
                  <div className="flex gap-4">
                    {['en', 'ar'].map((code) => (
                      <label key={code} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={localeSettings.enabledLocales.includes(code)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setLocaleSettings((s) => ({ ...s, enabledLocales: [...s.enabledLocales, code] }));
                            } else {
                              setLocaleSettings((s) => ({
                                ...s,
                                enabledLocales: s.enabledLocales.filter((l) => l !== code),
                                defaultLocale: s.defaultLocale === code ? (s.enabledLocales.find((l) => l !== code) || 'en') : s.defaultLocale,
                              }));
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span>{code === 'en' ? 'English' : 'العربية (Arabic)'}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">Users can only choose from enabled languages. At least one must be enabled.</p>
                </div>
                <Button onClick={() => localeSaveMutation.mutate(localeSettings)} disabled={localeSaveMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Save locale settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* General Settings */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Basic platform configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="siteName">Site Name</Label>
                    <Input
                      id="siteName"
                      value={generalSettings.siteName}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, siteName: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="siteUrl">Site URL</Label>
                    <Input
                      id="siteUrl"
                      value={generalSettings.siteUrl}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, siteUrl: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">Contact Email</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={generalSettings.contactEmail}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, contactEmail: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminEmail">Admin Email</Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      value={generalSettings.adminEmail}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, adminEmail: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select value={generalSettings.timezone} onValueChange={(value) => setGeneralSettings({ ...generalSettings, timezone: value })}>
                      <SelectTrigger id="timezone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select value={generalSettings.language} onValueChange={(value) => setGeneralSettings({ ...generalSettings, language: value })}>
                      <SelectTrigger id="language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg bg-amber-50">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="font-medium">Maintenance Mode</p>
                      <p className="text-sm text-gray-600">
                        When enabled, the site will be unavailable to regular users
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={generalSettings.maintenanceMode}
                    onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, maintenanceMode: checked })}
                  />
                </div>

                <Button onClick={handleSaveGeneral} disabled={saveSettingsMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Save General Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Settings */}
          <TabsContent value="email">
            <Card>
              <CardHeader>
                <CardTitle>Email Configuration</CardTitle>
                <CardDescription>SMTP settings for sending emails</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="smtpHost">SMTP Host</Label>
                    <Input
                      id="smtpHost"
                      value={emailSettings.smtpHost}
                      onChange={(e) => setEmailSettings({ ...emailSettings, smtpHost: e.target.value })}
                      placeholder="smtp.gmail.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtpPort">SMTP Port</Label>
                    <Input
                      id="smtpPort"
                      value={emailSettings.smtpPort}
                      onChange={(e) => setEmailSettings({ ...emailSettings, smtpPort: e.target.value })}
                      placeholder="587"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtpUser">SMTP Username</Label>
                    <Input
                      id="smtpUser"
                      value={emailSettings.smtpUser}
                      onChange={(e) => setEmailSettings({ ...emailSettings, smtpUser: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtpPassword">SMTP Password</Label>
                    <Input
                      id="smtpPassword"
                      type="password"
                      value={emailSettings.smtpPassword}
                      onChange={(e) => setEmailSettings({ ...emailSettings, smtpPassword: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fromEmail">From Email</Label>
                    <Input
                      id="fromEmail"
                      type="email"
                      value={emailSettings.fromEmail}
                      onChange={(e) => setEmailSettings({ ...emailSettings, fromEmail: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fromName">From Name</Label>
                    <Input
                      id="fromName"
                      value={emailSettings.fromName}
                      onChange={(e) => setEmailSettings({ ...emailSettings, fromName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex space-x-3">
                  <Button onClick={handleSaveEmail} disabled={saveSettingsMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Email Settings
                  </Button>
                  <Button variant="outline">
                    <Mail className="h-4 w-4 mr-2" />
                    Send Test Email
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Configure admin notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">New User Registration</p>
                    <p className="text-sm text-gray-600">Get notified when new users register</p>
                  </div>
                  <Switch
                    checked={notificationSettings.newUserRegistration}
                    onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, newUserRegistration: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">New Course Created</p>
                    <p className="text-sm text-gray-600">Get notified when teachers create classes</p>
                  </div>
                  <Switch
                    checked={notificationSettings.newCourseCreated}
                    onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, newCourseCreated: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Report Submitted</p>
                    <p className="text-sm text-gray-600">Get notified when users submit reports</p>
                  </div>
                  <Switch
                    checked={notificationSettings.reportSubmitted}
                    onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, reportSubmitted: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Payment Received</p>
                    <p className="text-sm text-gray-600">Get notified about new payments</p>
                  </div>
                  <Switch
                    checked={notificationSettings.paymentReceived}
                    onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, paymentReceived: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">System Errors</p>
                    <p className="text-sm text-gray-600">Get notified about critical errors</p>
                  </div>
                  <Switch
                    checked={notificationSettings.systemErrors}
                    onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, systemErrors: checked })}
                  />
                </div>

                <Button onClick={handleSaveNotifications} disabled={saveSettingsMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Notification Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Configuration</CardTitle>
                <CardDescription>Manage authentication and security settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Require Email Verification</p>
                      <p className="text-sm text-gray-600">Users must verify their email to access the platform</p>
                    </div>
                    <Switch
                      checked={securitySettings.requireEmailVerification}
                      onCheckedChange={(checked) => setSecuritySettings({ ...securitySettings, requireEmailVerification: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Enable Two-Factor Authentication</p>
                      <p className="text-sm text-gray-600">Require 2FA for admin accounts</p>
                    </div>
                    <Switch
                      checked={securitySettings.enable2FA}
                      onCheckedChange={(checked) => setSecuritySettings({ ...securitySettings, enable2FA: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Require Strong Passwords</p>
                      <p className="text-sm text-gray-600">Enforce uppercase, lowercase, numbers, and symbols</p>
                    </div>
                    <Switch
                      checked={securitySettings.requireStrongPassword}
                      onCheckedChange={(checked) => setSecuritySettings({ ...securitySettings, requireStrongPassword: checked })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      value={securitySettings.sessionTimeout}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                    <Input
                      id="maxLoginAttempts"
                      type="number"
                      value={securitySettings.maxLoginAttempts}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, maxLoginAttempts: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="passwordMinLength">Password Min Length</Label>
                    <Input
                      id="passwordMinLength"
                      type="number"
                      value={securitySettings.passwordMinLength}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, passwordMinLength: e.target.value })}
                    />
                  </div>
                </div>

                <Button onClick={handleSaveSecurity} disabled={saveSettingsMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Security Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Settings */}
          <TabsContent value="payment">
            <Card>
              <CardHeader>
                <CardTitle>Payment Configuration</CardTitle>
                <CardDescription>Configure payment gateway and commission settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={paymentSettings.currency} onValueChange={(value) => setPaymentSettings({ ...paymentSettings, currency: value })}>
                      <SelectTrigger id="currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentGateway">Payment Gateway</Label>
                    <Select value={paymentSettings.paymentGateway} onValueChange={(value) => setPaymentSettings({ ...paymentSettings, paymentGateway: value })}>
                      <SelectTrigger id="paymentGateway">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stripe">Stripe</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stripePublicKey">Stripe Public Key</Label>
                    <Input
                      id="stripePublicKey"
                      value={paymentSettings.stripePublicKey}
                      onChange={(e) => setPaymentSettings({ ...paymentSettings, stripePublicKey: e.target.value })}
                      placeholder="pk_test_..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stripeSecretKey">Stripe Secret Key</Label>
                    <Input
                      id="stripeSecretKey"
                      type="password"
                      value={paymentSettings.stripeSecretKey}
                      onChange={(e) => setPaymentSettings({ ...paymentSettings, stripeSecretKey: e.target.value })}
                      placeholder="sk_test_..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="commissionRate">Commission Rate (%)</Label>
                    <Input
                      id="commissionRate"
                      type="number"
                      value={paymentSettings.commissionRate}
                      onChange={(e) => setPaymentSettings({ ...paymentSettings, commissionRate: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="minimumPayout">Minimum Payout ($)</Label>
                    <Input
                      id="minimumPayout"
                      type="number"
                      value={paymentSettings.minimumPayout}
                      onChange={(e) => setPaymentSettings({ ...paymentSettings, minimumPayout: e.target.value })}
                    />
                  </div>
                </div>

                <Button onClick={handleSavePayment} disabled={saveSettingsMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Payment Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
