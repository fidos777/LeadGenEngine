"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin() {
    try {
      const supabase = getSupabaseClient();

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        alert(error.message);
        return;
      }

      window.location.href = "/discovery";
    } catch (err) {
      console.error("Login error:", err);
      alert("Login failed. Please try again.");
    }
  }

  return (
    <div className="w-full max-w-md p-8 border border-gray-800 rounded-xl">
      <h1 className="text-2xl font-bold mb-6 text-center">
        Sign In
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
          onClick={handleLogin}
          className="w-full bg-white text-black p-3 rounded"
        >
          Login
        </button>
      </div>
    </div>
  );
}
