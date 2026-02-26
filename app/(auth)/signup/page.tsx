"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSignup() {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        alert(error.message);
      } else {
        window.location.href = "/discovery";
      }
    } catch (err) {
      console.error("Signup error:", err);
      alert("Signup failed. Please try again.");
    }
  }

  return (
    <div className="w-full max-w-md p-8 border border-gray-800 rounded-xl">
      <h1 className="text-2xl font-bold mb-6 text-center">
        Create Account
      </h1>

      <div className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full p-3 bg-black border border-gray-700 rounded"
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full p-3 bg-black border border-gray-700 rounded"
        />

        <button
          type="button"
          onClick={handleSignup}
          className="w-full bg-white text-black p-3 rounded"
        >
          Sign Up
        </button>
      </div>
    </div>
  );
}
