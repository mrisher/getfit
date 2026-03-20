"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { RoutineExercise, getOrGenerateDailyRoutine } from "@/lib/routineGenerator";
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

export default function Home() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const [routine, setRoutine] = useState<RoutineExercise[]>([]);
  const [loading, setLoading] = useState(false);

  const [activeExerciseIdx, setActiveExerciseIdx] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [isResting, setIsResting] = useState(false);
  const [restTimer, setRestTimer] = useState(30);
  const [showFeedback, setShowFeedback] = useState(false);

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

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isResting && restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer((prev) => {
          if (prev <= 1) {
            setIsResting(false);
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isResting, restTimer]);

  const handleAdvance = () => {
    const currentEx = routine[activeExerciseIdx];
    if (currentSet < currentEx.targetSets) {
      setCurrentSet((prev) => prev + 1);
      setIsResting(true);
      setRestTimer(30);
    } else {
      setShowFeedback(true);
    }
  };

  const handleFeedback = async (emoji: string) => {
    if (!user) return;
    const currentEx = routine[activeExerciseIdx];

    try {
      const now = new Date();
      await addDoc(collection(db, "history"), {
        userId: user.uid,
        exerciseId: currentEx.exercise.id,
        exerciseName: currentEx.exercise.name,
        date: now.toISOString(),
        dateString: now.toISOString().split("T")[0],
        sets: currentEx.targetSets,
        reps: currentEx.targetReps,
        weight: currentEx.suggestedWeight,
        feedback: emoji,
      });
    } catch (e) {
      console.error("Failed to save history", e);
    }

    setShowFeedback(false);

    if (activeExerciseIdx < routine.length - 1) {
      setActiveExerciseIdx((prev) => prev + 1);
      setCurrentSet(1);
      setIsResting(true);
      setRestTimer(60); // Longer rest between exercises
    } else {
      alert("Workout Complete!");
      setRoutine([]);
    }
  };

  if (authLoading) return <div className="p-8">Loading Auth...</div>;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <h1 className="text-3xl font-bold mb-8">Daily Fitness Routine</h1>
        <button
          onClick={signInWithGoogle}
          className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg"
        >
          Sign In with Google
        </button>
      </div>
    );
  }

  if (loading) return <div className="p-8 text-center text-xl">Generating today&apos;s routine...</div>;

  if (routine.length === 0) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">No exercises found for your equipment!</h2>
        <Link href="/settings" className="text-blue-500 underline">Go to Settings</Link>
      </div>
    );
  }

  const currentEx = routine[activeExerciseIdx];

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md overflow-hidden p-6 relative">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div className="text-sm font-semibold text-gray-500 uppercase">
            Exercise {activeExerciseIdx + 1} of {routine.length}
          </div>
          <Link href="/routine" className="text-sm text-blue-500 font-semibold underline">
            View Full Routine
          </Link>
        </div>

        {showFeedback ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-6">How was that exercise?</h2>
            <div className="flex justify-center gap-6">
              <button onClick={() => handleFeedback("😞")} className="text-5xl hover:scale-110 transition">😞</button>
              <button onClick={() => handleFeedback("😐")} className="text-5xl hover:scale-110 transition">😐</button>
              <button onClick={() => handleFeedback("🤩")} className="text-5xl hover:scale-110 transition">🤩</button>
            </div>
          </div>
        ) : isResting ? (
          <div className="text-center py-12">
            <h2 className="text-3xl font-bold text-blue-600 mb-2">Rest</h2>
            <div className="text-6xl font-mono text-gray-800">{restTimer}s</div>
            <button
              onClick={() => setIsResting(false)}
              className="mt-8 bg-gray-200 text-gray-800 px-6 py-2 rounded-full font-semibold"
            >
              Skip Rest
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-bold text-center mb-2">{currentEx.exercise.name}</h2>
            <div className="flex gap-4 mb-6">
              <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                {currentEx.exercise.equipment || "bodyweight"}
              </span>
              <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                {currentEx.exercise.primaryMuscles[0]}
              </span>
            </div>

            <div className="flex w-full justify-around bg-gray-50 p-4 rounded-lg mb-6">
              <div className="text-center">
                <div className="text-sm text-gray-500 uppercase font-semibold">Set</div>
                <div className="text-2xl font-bold">{currentSet} / {currentEx.targetSets}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500 uppercase font-semibold">Reps</div>
                <div className="text-2xl font-bold">{currentEx.targetReps}</div>
              </div>
              {currentEx.suggestedWeight! > 0 && (
                <div className="text-center">
                  <div className="text-sm text-gray-500 uppercase font-semibold">Weight</div>
                  <div className="text-2xl font-bold">{currentEx.suggestedWeight}</div>
                </div>
              )}
            </div>

            <p className="text-gray-600 text-sm mb-8 text-center line-clamp-3">
              {currentEx.exercise.instructions && currentEx.exercise.instructions[0]}
            </p>

            <button
              onClick={handleAdvance}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition-colors text-lg"
            >
              {currentSet === currentEx.targetSets ? "Finish Exercise" : "Complete Set"}
            </button>
          </div>
        )}
      </div>

      <div className="mt-8 w-full max-w-md flex justify-between px-4">
        <Link href="/settings" className="text-gray-500 hover:text-gray-800 font-semibold">Settings</Link>
        <Link href="/history" className="text-gray-500 hover:text-gray-800 font-semibold">History</Link>
      </div>
    </div>
  );
}
