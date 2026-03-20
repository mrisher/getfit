"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { RoutineExercise, getOrGenerateDailyRoutine } from "@/lib/routineGenerator";
import Link from "next/link";

export default function Routine() {
  const { user, loading: authLoading } = useAuth();
  const [routine, setRoutine] = useState<RoutineExercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (user) {
      const fetchRoutine = async () => {
        try {
          const r = await getOrGenerateDailyRoutine(user.uid);
          if (mounted) {
            setRoutine(r);
            setLoading(false);
          }
        } catch (e) {
          console.error(e);
          if (mounted) {
            setLoading(false);
          }
        }
      };
      fetchRoutine();
    } else if (!authLoading) {
      setTimeout(() => {
        if (mounted) setLoading(false);
      }, 0);
    }
    return () => { mounted = false; };
  }, [user, authLoading]);

  if (authLoading || loading) return <div className="p-8">Loading...</div>;

  if (!user) {
    return <div className="p-8">Please log in to view your routine.</div>;
  }

  return (
    <div className="p-8 max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Today&apos;s Routine</h1>
        <Link href="/" className="text-blue-500 font-semibold underline">Back to Workout</Link>
      </div>

      <div className="flex flex-col gap-4">
        {routine.map((item, idx) => (
          <div key={idx} className="bg-white p-4 rounded-lg shadow border border-gray-100 flex justify-between items-center">
            <div>
              <div className="font-bold text-lg">{item.exercise.name}</div>
              <div className="text-sm text-gray-500">
                {item.exercise.equipment || "Bodyweight"} • {item.exercise.primaryMuscles[0]}
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold">{item.targetSets} sets</div>
              <div className="text-sm text-gray-600">{item.targetReps} reps</div>
              {item.suggestedWeight! > 0 && (
                <div className="text-sm font-bold text-blue-600">{item.suggestedWeight} lbs</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
