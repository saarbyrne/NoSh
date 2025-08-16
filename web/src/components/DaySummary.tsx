"use client";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import DaySummaryClient from "./DaySummaryClient";

interface DaySummaryProps {
  date?: string;
}

export default function DaySummary({ date }: DaySummaryProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await getSupabaseClient().auth.getUser();
        if (user) {
          setUserId(user.id);
        }
      } catch (error) {
        console.error("Error getting user:", error);
      } finally {
        setLoading(false);
      }
    };

    getUser();
  }, []);

  if (loading) {
    return <div className="text-muted">Loading user...</div>;
  }

  if (!userId) {
    return <div className="text-muted">Please log in to view day summary.</div>;
  }

  if (!date) {
    return <div className="text-muted">No date provided.</div>;
  }

  return <DaySummaryClient userId={userId} date={date} />;
}


