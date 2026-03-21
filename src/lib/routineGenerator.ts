import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

export interface Exercise {
  id: string;
  name: string;
  force: string;
  level: string;
  mechanic: string;
  equipment: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
  images: string[];
}

export interface RoutineExercise {
  exercise: Exercise;
  targetSets: number;
  targetReps: number;
  suggestedWeight?: number;
}

export async function getOrGenerateDailyRoutine(userId: string): Promise<RoutineExercise[]> {
  const dateString = new Date().toISOString().split("T")[0];
  const routineDocRef = doc(db, "routines", `${userId}_${dateString}`);
  const routineSnap = await getDoc(routineDocRef);

  if (routineSnap.exists()) {
    return routineSnap.data().exercises as RoutineExercise[];
  }

  // 1. Fetch user settings (equipment)
  const userDocRef = doc(db, "users", userId);
  const userDocSnap = await getDoc(userDocRef);
  let availableEquipment = ["body only"]; // Default
  if (userDocSnap.exists() && userDocSnap.data().equipment) {
    availableEquipment = [...userDocSnap.data().equipment, "body only"]; // Always include bodyweight
  }

  // 2. Fetch all exercises
  const res = await fetch("https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json");
  const allExercises: Exercise[] = await res.json();

  // 3. Filter by equipment
  const validExercises = allExercises.filter(ex =>
    !ex.equipment || availableEquipment.includes(ex.equipment)
  );

  // 4. Randomly pick 5 exercises to form the routine
  const routineLength = 5;
  const selectedExercises: Exercise[] = [];

  if (validExercises.length === 0) {
    return [];
  }

  for (let i = 0; i < routineLength; i++) {
    const randomIndex = Math.floor(Math.random() * validExercises.length);
    selectedExercises.push(validExercises[randomIndex]);
  }

  // 5. Build the routine and adjust against user history
  const routine: RoutineExercise[] = [];

  for (const ex of selectedExercises) {
    let targetSets = 3;
    let targetReps = 10;
    let suggestedWeight = 0;

    // Fetch history for this exercise
    // Using equality filters only, sorting in memory to avoid needing composite index
    const historyRef = collection(db, "history");
    const q = query(
      historyRef,
      where("userId", "==", userId),
      where("exerciseId", "==", ex.id)
    );

    const historySnap = await getDocs(q);

    if (!historySnap.empty) {
      // Sort in memory by date descending
      const historyDocs = historySnap.docs.map(doc => doc.data());
      historyDocs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const lastSession = historyDocs[0];
      const lastFeedback = lastSession.feedback; // e.g., "😞", "😐", "🤩"

      targetReps = lastSession.reps || 10;
      targetSets = lastSession.sets || 3;
      suggestedWeight = lastSession.weight || 0;

      // Adjust based on feedback
      if (lastFeedback === "😞") { // Hard -> Decrease weight or reps
        if (suggestedWeight > 5) {
          suggestedWeight -= 5;
        } else if (targetReps > 5) {
          targetReps -= 2;
        }
      } else if (lastFeedback === "🤩") { // Easy -> Increase weight or reps
        if (suggestedWeight > 0) {
          suggestedWeight += 5;
        } else {
          targetReps += 2;
        }
      }
    } else {
      // Give basic sensible defaults for new exercises based on category
      if (ex.equipment !== "body only" && ex.equipment !== "stretching") {
        suggestedWeight = 10; // Start with 10 for any weighted equipment
      }
    }

    routine.push({
      exercise: ex,
      targetSets,
      targetReps,
      suggestedWeight
    });
  }

  // Save the generated routine to Firestore
  try {
    const { setDoc } = await import("firebase/firestore");
    await setDoc(routineDocRef, {
      userId,
      dateString,
      exercises: routine
    });
  } catch (e) {
    console.error("Failed to save generated routine:", e);
  }

  return routine;
}
