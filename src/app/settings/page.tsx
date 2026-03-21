"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const equipmentOptions = [
  "dumbbell",
  "barbell",
  "body only",
  "machine",
  "cable",
  "kettlebells",
  "bands",
  "medicine ball",
  "exercise ball",
  "e-z curl bar",
];

export default function Settings() {
  const { user, loading } = useAuth();
  const [equipment, setEquipment] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (user && !loaded) {
      const fetchSettings = async () => {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setEquipment(docSnap.data().equipment || []);
        }
        setLoaded(true);
      };
      fetchSettings();
    }
  }, [user, loaded]);

  const handleToggle = (item: string) => {
    setEquipment((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "users", user.uid), { equipment }, { merge: true });
      alert("Settings saved!");
    } catch (e) {
      console.error(e);
      alert("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Settings</h1>
        <p>Please log in to manage your settings.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">Available Equipment</h2>
        <div className="flex flex-col gap-2">
          {equipmentOptions.map((item) => (
            <label key={item} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={equipment.includes(item)}
                onChange={() => handleToggle(item)}
                className="w-5 h-5"
              />
              <span className="capitalize">{item}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-blue-600 text-white font-semibold py-2 rounded disabled:bg-blue-300"
      >
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}
