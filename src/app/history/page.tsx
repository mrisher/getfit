"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

import Link from "next/link";

interface HistoryItem {
  exerciseName: string;
  date: string;
  sets: number;
  reps: number;
  weight: number;
  feedback: string;
}

export default function History() {
  const { user, loading: authLoading } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && date) {
      const fetchHistory = async () => {
        setLoading(true);
        const q = query(
          collection(db, "history"),
          where("userId", "==", user.uid),
          where("dateString", "==", date)
        );

        try {
          const snapshot = await getDocs(q);
          const docs = snapshot.docs.map(doc => doc.data() as HistoryItem);
          // Sort by date in memory
          docs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setHistory(docs);
        } catch (e) {
          console.error("Failed to fetch history", e);
        } finally {
          setLoading(false);
        }
      };

      fetchHistory();
    }
  }, [user, date]);

  if (authLoading) return <div className="p-8">Loading Auth...</div>;

  if (!user) {
    return <div className="p-8">Please log in to view history.</div>;
  }

  return (
    <div className="p-8 max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Workout History</h1>
        <Link href="/" className="text-blue-500 font-semibold underline">Back to Workout</Link>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-gray-300 rounded-md shadow-sm p-2 w-full focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {loading ? (
        <div className="text-center text-gray-500">Loading history...</div>
      ) : history.length === 0 ? (
        <div className="text-center text-gray-500">No workout history found for {date}.</div>
      ) : (
        <div className="flex flex-col gap-4">
          {history.map((item, idx) => (
            <div key={idx} className="bg-white p-4 rounded-lg shadow border border-gray-100 flex justify-between items-center">
              <div>
                <div className="font-bold text-lg">{item.exerciseName}</div>
                <div className="text-sm text-gray-500">
                  {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">{item.sets} sets x {item.reps} reps</div>
                {item.weight > 0 && (
                  <div className="text-sm text-gray-600">{item.weight} lbs</div>
                )}
                <div className="text-2xl mt-1">{item.feedback}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
