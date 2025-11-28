"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, MessageCircle, AlertCircle } from "lucide-react";

interface WhatsAppSubscription {
  id: string;
  phone_number: string;
  is_active: boolean;
  preferences: {
    goals_notification: boolean;
    weekly_checkin: boolean;
    daily_reminders: boolean;
  };
}

export default function WhatsAppSettingsPage() {
  const [subscription, setSubscription] = useState<WhatsAppSubscription | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadSubscription();
  }, []);

  async function loadSubscription() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("whatsapp_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (data) {
        setSubscription(data);
        setPhoneNumber(data.phone_number);
      }
    } catch (error) {
      console.error("Error loading subscription:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribe() {
    setSaving(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Validate phone number format
      const cleanPhone = phoneNumber.replace(/\D/g, "");
      if (cleanPhone.length < 10) {
        throw new Error("Please enter a valid phone number");
      }

      const formattedPhone = cleanPhone.startsWith("+") ? cleanPhone : `+${cleanPhone}`;

      const { error } = await supabase
        .from("whatsapp_subscriptions")
        .upsert({
          user_id: user.id,
          phone_number: formattedPhone,
          is_active: true,
          preferences: {
            goals_notification: true,
            weekly_checkin: true,
            daily_reminders: false,
          },
        });

      if (error) throw error;

      setMessage({
        type: "success",
        text: "WhatsApp notifications enabled! Send 'join NoSh' to the Twilio sandbox number to start.",
      });

      await loadSubscription();
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Failed to subscribe",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleUnsubscribe() {
    if (!subscription) return;

    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from("whatsapp_subscriptions")
        .update({ is_active: false, unsubscribed_at: new Date().toISOString() })
        .eq("id", subscription.id);

      if (error) throw error;

      setMessage({
        type: "success",
        text: "WhatsApp notifications disabled.",
      });

      setSubscription(null);
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Failed to unsubscribe",
      });
    } finally {
      setSaving(false);
    }
  }

  async function updatePreference(key: keyof WhatsAppSubscription["preferences"], value: boolean) {
    if (!subscription) return;

    try {
      const updatedPreferences = {
        ...subscription.preferences,
        [key]: value,
      };

      const { error } = await supabase
        .from("whatsapp_subscriptions")
        .update({ preferences: updatedPreferences })
        .eq("id", subscription.id);

      if (error) throw error;

      setSubscription({
        ...subscription,
        preferences: updatedPreferences,
      });

      setMessage({
        type: "success",
        text: "Preferences updated",
      });
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Failed to update preferences",
      });
    }
  }

  if (loading) {
    return <div className="container max-w-2xl py-8">Loading...</div>;
  }

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">WhatsApp Notifications</h1>
        <p className="text-muted-foreground mt-2">
          Get your nutrition goals and chat with NoSh AI via WhatsApp
        </p>
      </div>

      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"}>
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {!subscription ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Enable WhatsApp Notifications
            </CardTitle>
            <CardDescription>
              Receive your personalized nutrition goals and chat with NoSh AI directly on WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1234567890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Include country code (e.g., +1 for US)
              </p>
            </div>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h3 className="font-semibold">What you'll receive:</h3>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>Your 3 personalized nutrition goals when they're ready</li>
                <li>Weekly check-ins to track your progress</li>
                <li>Ability to ask questions about your nutrition patterns</li>
              </ul>
            </div>

            <Button onClick={handleSubscribe} disabled={saving || !phoneNumber} className="w-full">
              {saving ? "Enabling..." : "Enable WhatsApp Notifications"}
            </Button>

            <Alert>
              <AlertDescription className="text-sm">
                <strong>Twilio Sandbox Setup:</strong> After enabling, you'll need to send{" "}
                <code className="bg-background px-1 py-0.5 rounded">join NoSh</code> to the Twilio
                sandbox number to start receiving messages.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                WhatsApp Enabled
              </CardTitle>
              <CardDescription>
                Connected to {subscription.phone_number}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Goal Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive your nutrition goals via WhatsApp
                    </p>
                  </div>
                  <Switch
                    checked={subscription.preferences.goals_notification}
                    onCheckedChange={(checked) => updatePreference("goals_notification", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Weekly Check-ins</Label>
                    <p className="text-sm text-muted-foreground">
                      Get weekly progress updates
                    </p>
                  </div>
                  <Switch
                    checked={subscription.preferences.weekly_checkin}
                    onCheckedChange={(checked) => updatePreference("weekly_checkin", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Daily Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Daily photo upload reminders
                    </p>
                  </div>
                  <Switch
                    checked={subscription.preferences.daily_reminders}
                    onCheckedChange={(checked) => updatePreference("daily_reminders", checked)}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button
                  variant="destructive"
                  onClick={handleUnsubscribe}
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? "Disabling..." : "Disable WhatsApp Notifications"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How to Use WhatsApp</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><strong>Commands you can send:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><code>goals</code> - View your current nutrition goals</li>
                <li><code>stats</code> - See your eating patterns</li>
                <li><code>help</code> - Get list of all commands</li>
              </ul>
              <p className="pt-2">
                <strong>Or just ask questions!</strong> For example:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>"Why should I reduce sugar?"</li>
                <li>"How much coffee did I drink this week?"</li>
                <li>"What are my eating patterns?"</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
