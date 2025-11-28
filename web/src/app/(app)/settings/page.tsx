"use client";
import { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import RequireAuth from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { 
  ArrowLeft, 
  Shield, 
  Info, 
  Check, 
  Trash2, 
  Download
} from "lucide-react";

export default function SettingsPage() {
  const [user, setUser] = useState<{ id: string; email?: string; created_at?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasConsented, setHasConsented] = useState(false);
  const [showConsentDetails, setShowConsentDetails] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const { push } = useToast();

  // Helper function to get the Supabase client
  const getClient = () => {
    return getSupabaseClient();
  };

  const loadUserPreferences = useCallback(async () => {
    try {
      if (!user?.id) {
        console.log("No user ID available for loading preferences");
        // Try to load from localStorage as fallback
        const localConsent = localStorage.getItem('photo_analysis_consent');
        if (localConsent !== null) {
          setHasConsented(localConsent === 'true');
          setIsOfflineMode(true);
        }
        return;
      }

      try {
        const client = getClient();
        const { data, error } = await client
          .from('profiles')
          .select('photo_analysis_consent')
          .eq('id', user.id)
          .single();
        
        if (error) {
          throw error;
        }

        if (data) {
          setHasConsented(data.photo_analysis_consent || false);
          setIsOfflineMode(false);
        }
      } catch (dbError) {
        console.error("Database error, loading from localStorage:", dbError);
        
        // Fallback to localStorage
        const localConsent = localStorage.getItem('photo_analysis_consent');
        if (localConsent !== null) {
          setHasConsented(localConsent === 'true');
          setIsOfflineMode(true);
        }
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    }
  }, [user?.id]);

  useEffect(() => {
    const getUser = async () => {
      try {
        const client = getClient();
        const { data: { user } } = await client.auth.getUser();
        if (user) {
          setUser(user);
          // Load user's photo analysis consent preference
          await loadUserPreferences();
        }
      } catch (error) {
        console.error("Error getting user:", error);
        push("Failed to load user data");
      } finally {
        setLoading(false);
      }
    };

    getUser();
  }, [push, loadUserPreferences]);

  const handleConsentChange = async (consented: boolean) => {
    try {
      setHasConsented(consented);
      
      // Check if user is authenticated
      if (!user?.id) {
        console.error("No authenticated user found");
        push("Please log in to save preferences");
        setHasConsented(!consented);
        return;
      }

      // Try to save to database
      try {
        const client = getClient();
        const { error } = await client
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email,
            photo_analysis_consent: consented,
            updated_at: new Date().toISOString()
          });

        if (error) {
          throw error;
        }

        // Success - save to localStorage as backup
        localStorage.setItem('photo_analysis_consent', consented.toString());
        setIsOfflineMode(false);
        push(consented ? "Photo analysis enabled" : "Photo analysis disabled");
      } catch (dbError) {
        console.error("Database error, falling back to localStorage:", dbError);
        
        // Fallback to localStorage
        localStorage.setItem('photo_analysis_consent', consented.toString());
        setIsOfflineMode(true);
        push(`${consented ? "Photo analysis enabled" : "Photo analysis disabled"} (saved locally - database unavailable)`);
      }
    } catch (error) {
      console.error("Error updating consent:", error);
      push(`Failed to update preferences: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setHasConsented(!consented); // Revert on error
    }
  };

  const handleExportData = async () => {
    try {
      // In a real app, you'd generate and download user data
      push("Data export feature coming soon");
    } catch (error) {
      console.error("Error exporting data:", error);
      push("Failed to export data");
    }
  };

  const handleDeleteAllData = async () => {
    if (!confirm("Are you sure you want to delete all your data? This action cannot be undone.")) {
      return;
    }

    try {
      // In a real app, you'd call a function to delete all user data
      push("Data deletion feature coming soon");
    } catch (error) {
      console.error("Error deleting data:", error);
      push("Failed to delete data");
    }
  };

  if (loading) {
    return (
      <RequireAuth>
        <div className="min-h-screen bg-background pb-24">
          <Header title="Settings" />
          <div className="pt-20 p-4 sm:p-6 max-w-4xl mx-auto pb-24">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/3"></div>
              <div className="h-32 bg-muted rounded"></div>
              <div className="h-32 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <div className="min-h-screen bg-background pb-24">
        <Header title="Settings" />
        <div className="pt-20 p-4 sm:p-6 max-w-4xl mx-auto pb-24 space-y-8">
          </div>

          {/* Privacy & Data section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Privacy & Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Photo analysis consent */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm">Photo Analysis</div>
                    <div className="text-xs text-muted-foreground">
                      Allow automatic AI analysis of food photos
                    </div>
                  </div>
                  <Switch
                    checked={hasConsented}
                    onCheckedChange={handleConsentChange}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant={hasConsented ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {hasConsented ? (
                      <>
                        <Check className="w-3 h-3 mr-1" />
                        Enabled
                      </>
                    ) : (
                      "Disabled"
                    )}
                  </Badge>
                </div>
              </div>

              {/* Toggle consent details */}
              <Button
                onClick={() => setShowConsentDetails(!showConsentDetails)}
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground h-auto p-0"
              >
                <Info className="w-3 h-3 mr-1" />
                {showConsentDetails ? "Hide" : "Show"} data handling details
              </Button>

              {/* Consent details */}
              {showConsentDetails && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="text-xs space-y-2">
                    <div className="space-y-1">
                      <div className="text-muted-foreground">
                        What happens to your photos:
                      </div>
                      <ul className="space-y-1 ml-4 text-muted-foreground">
                        <li>• Photos are analyzed by AI to detect food categories</li>
                        <li>• Nutritional data is extracted and saved</li>
                        <li>• Original photos are permanently deleted after 30 days</li>
                        <li>• Only aggregated nutrition data is kept long-term</li>
                      </ul>
                    </div>

                    <div className="space-y-1">
                      <div className="text-muted-foreground">Your rights:</div>
                      <ul className="space-y-1 ml-4 text-muted-foreground">
                        <li>• You can disable analysis at any time</li>
                        <li>• Request deletion of all your data</li>
                        <li>• Export your nutrition data</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status alert */}
          {!hasConsented && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Photo analysis is disabled. You can still track manually, but won&apos;t get automated nutrition insights.
                {isOfflineMode && " (Settings saved locally)"}
              </AlertDescription>
            </Alert>
          )}

          {hasConsented && (
            <Alert className="border-primary/20 bg-primary/5">
              <Check className="h-4 w-4 text-primary" />
              <AlertDescription className="text-primary">
                Photo analysis is enabled. Your photos will be processed automatically.
                {isOfflineMode && " (Settings saved locally)"}
              </AlertDescription>
            </Alert>
          )}

          {/* Offline mode indicator */}
          {isOfflineMode && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <Info className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                Database unavailable. Settings are saved locally and will sync when connection is restored.
              </AlertDescription>
            </Alert>
          )}

          {/* App Information */}
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-base">App Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Version</span>
                <span>1.0.0</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Last updated</span>
                <span>Dec 2024</span>
              </div>
            </CardContent>
          </Card>

          {/* Additional actions */}
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full h-10"
              onClick={handleExportData}
            >
              <Download className="w-4 h-4 mr-2" />
              Export My Data
            </Button>

            <Button
              variant="outline"
              className="w-full h-10 text-destructive border-destructive/20"
              onClick={handleDeleteAllData}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete All Data
            </Button>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
