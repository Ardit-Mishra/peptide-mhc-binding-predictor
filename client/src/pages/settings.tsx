import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Settings, Database, Cpu, Bell, Shield, Download, Upload, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [notifications, setNotifications] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [defaultModel, setDefaultModel] = useState("cnn_bilstm_best");
  const [batchSize, setBatchSize] = useState("32");
  const [cacheEnabled, setCacheEnabled] = useState(true);

  const handleSaveSettings = () => {
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated successfully.",
    });
  };

  const handleExportData = () => {
    toast({
      title: "Export started",
      description: "Your data export will be ready for download shortly.",
    });
  };

  const handleClearCache = () => {
    toast({
      title: "Cache cleared",
      description: "Model cache and temporary files have been cleared.",
    });
  };

  return (
    <div className="space-y-6" data-testid="settings-page">
      <div className="flex items-center space-x-3">
        <div className="gradient-bg p-2 rounded-lg">
          <Settings className="text-white text-lg" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Configure your preferences and system settings</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" data-testid="tab-general">General</TabsTrigger>
          <TabsTrigger value="models" data-testid="tab-models">Models</TabsTrigger>
          <TabsTrigger value="security" data-testid="tab-security">Security</TabsTrigger>
          <TabsTrigger value="data" data-testid="tab-data">Data</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="w-5 h-5" />
                <span>Notifications</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notifications">Enable notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive alerts for batch job completions and system updates
                  </p>
                </div>
                <Switch
                  id="notifications"
                  checked={notifications}
                  onCheckedChange={setNotifications}
                  data-testid="switch-notifications"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-save">Auto-save results</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically save prediction results to your project
                  </p>
                </div>
                <Switch
                  id="auto-save"
                  checked={autoSave}
                  onCheckedChange={setAutoSave}
                  data-testid="switch-auto-save"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Default Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="default-model">Default prediction model</Label>
                <Select value={defaultModel} onValueChange={setDefaultModel}>
                  <SelectTrigger data-testid="select-default-model">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cnn">CNN - Fast pattern recognition</SelectItem>
                    <SelectItem value="bilstm">BiLSTM - Sequence dependencies</SelectItem>
                    <SelectItem value="cnn_bilstm">CNN+BiLSTM - Balanced approach</SelectItem>
                    <SelectItem value="cnn_bilstm_best">CNN+BiLSTM Best - Highest accuracy</SelectItem>
                    <SelectItem value="transformer">Transformer - State-of-the-art</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="batch-size">Default batch size</Label>
                <Select value={batchSize} onValueChange={setBatchSize}>
                  <SelectTrigger data-testid="select-batch-size">
                    <SelectValue placeholder="Select batch size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16">16 sequences</SelectItem>
                    <SelectItem value="32">32 sequences</SelectItem>
                    <SelectItem value="64">64 sequences</SelectItem>
                    <SelectItem value="128">128 sequences</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Cpu className="w-5 h-5" />
                <span>Model Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="cache-enabled">Enable model caching</Label>
                  <p className="text-sm text-muted-foreground">
                    Cache model weights to improve prediction speed
                  </p>
                </div>
                <Switch
                  id="cache-enabled"
                  checked={cacheEnabled}
                  onCheckedChange={setCacheEnabled}
                  data-testid="switch-cache"
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>Model Status</Label>
                <div className="grid gap-3">
                  {[
                    { name: "CNN", status: "loaded", accuracy: "92.4%" },
                    { name: "BiLSTM", status: "loaded", accuracy: "89.7%" },
                    { name: "CNN+BiLSTM", status: "loaded", accuracy: "93.2%" },
                    { name: "CNN+BiLSTM Best", status: "loaded", accuracy: "95.8%" },
                    { name: "Transformer", status: "loaded", accuracy: "96.3%" },
                  ].map((model) => (
                    <div key={model.name} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="font-medium">{model.name}</span>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {model.status}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Accuracy: {model.accuracy}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                variant="outline"
                onClick={handleClearCache}
                className="w-full"
                data-testid="button-clear-cache"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Model Cache
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>API Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="api-key">External API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="Enter your external API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  data-testid="input-api-key"
                />
                <p className="text-sm text-muted-foreground">
                  Used for external database integrations and literature searches
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>Session Settings</Label>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Session timeout:</span>
                    <span>24 hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last login:</span>
                    <span>Today, 2:30 AM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active sessions:</span>
                    <span>1</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="w-5 h-5" />
                <span>Data Management</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Button
                  variant="outline"
                  onClick={handleExportData}
                  data-testid="button-export-data"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </Button>

                <Button variant="outline" data-testid="button-import-data">
                  <Upload className="w-4 h-4 mr-2" />
                  Import Data
                </Button>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>Storage Information</Label>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Predictions stored:</span>
                    <span>1,247</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Projects created:</span>
                    <span>8</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cache size:</span>
                    <span>245 MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last backup:</span>
                    <span>2 hours ago</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <p className="font-medium">Save changes</p>
              <p className="text-sm text-muted-foreground">
                Make sure to save your settings before leaving this page
              </p>
            </div>
            <Button onClick={handleSaveSettings} data-testid="button-save-settings">
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}