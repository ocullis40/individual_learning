"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Topic {
  id: string;
  name: string;
  parentTopic: { id: string; name: string } | null;
}

interface AgentStep {
  tool: string;
  input: unknown;
  output: unknown;
}

interface AgentResult {
  success: boolean;
  message: string;
  lessonId?: string;
  steps: AgentStep[];
}

type ViewState = "form" | "loading" | "success" | "error";

export default function AdminLessonsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicId, setTopicId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [educationLevel, setEducationLevel] = useState("");

  // New topic fields
  const [creatingTopic, setCreatingTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [newTopicDescription, setNewTopicDescription] = useState("");
  const [newTopicParentId, setNewTopicParentId] = useState("");
  const [topicSaving, setTopicSaving] = useState(false);

  const [viewState, setViewState] = useState<ViewState>("form");
  const [result, setResult] = useState<AgentResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchTopics = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/topics");
      const json = await res.json();
      if (json.data) setTopics(json.data);
    } catch {
      // silently fail, user can still type
    }
  }, []);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  const handleCreateTopic = async () => {
    if (!newTopicName.trim() || !newTopicDescription.trim()) return;
    setTopicSaving(true);
    try {
      const res = await fetch("/api/admin/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTopicName.trim(),
          description: newTopicDescription.trim(),
          ...(newTopicParentId ? { parentTopicId: newTopicParentId } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.error || "Failed to create topic");
        return;
      }
      const created = json.data as Topic;
      setTopics((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setTopicId(created.id);
      setCreatingTopic(false);
      setNewTopicName("");
      setNewTopicDescription("");
      setNewTopicParentId("");
    } catch {
      setErrorMessage("Failed to create topic");
    } finally {
      setTopicSaving(false);
    }
  };

  const handleGenerate = async () => {
    setViewState("loading");
    setResult(null);
    setErrorMessage("");

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 150000); // 2.5 minutes

      const res = await fetch("/api/admin/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId, title: title.trim(), educationLevel, ...(description.trim() ? { description: description.trim() } : {}) }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const json = await res.json();

      if (!res.ok) {
        setErrorMessage(json.error || "Request failed");
        setViewState("error");
        return;
      }

      if (json.success) {
        setResult(json);
        setViewState("success");
      } else {
        setErrorMessage(json.message || "Agent did not complete successfully");
        setResult(json);
        setViewState("error");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setErrorMessage("Agent took too long to respond. Please try again.");
      } else {
        setErrorMessage("Network error. Please try again.");
      }
      setViewState("error");
    }
  };

  const handleReset = () => {
    setTopicId("");
    setTitle("");
    setDescription("");
    setEducationLevel("");
    setCreatingTopic(false);
    setNewTopicName("");
    setNewTopicDescription("");
    setNewTopicParentId("");
    setResult(null);
    setErrorMessage("");
    setViewState("form");
  };

  const formValid = topicId && title.trim() && educationLevel;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold">Generate Lesson</h1>
      <p className="mt-2 text-gray-600">
        Use the content agent to generate a new lesson.
      </p>

      {viewState === "form" && (
        <div className="mt-8 space-y-6">
          {/* Topic selector */}
          <div>
            <label htmlFor="topic" className="block text-sm font-medium text-gray-700">
              Topic
            </label>
            <select
              id="topic"
              value={creatingTopic ? "__new__" : topicId}
              onChange={(e) => {
                if (e.target.value === "__new__") {
                  setCreatingTopic(true);
                  setTopicId("");
                } else {
                  setCreatingTopic(false);
                  setTopicId(e.target.value);
                }
              }}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select a topic...</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.parentTopic ? ` (${t.parentTopic.name})` : ""}
                </option>
              ))}
              <option value="__new__">Create new topic</option>
            </select>
          </div>

          {/* New topic form */}
          {creatingTopic && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-4 space-y-4">
              <h3 className="text-sm font-semibold text-blue-800">New Topic</h3>
              <div>
                <label htmlFor="newTopicName" className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  id="newTopicName"
                  type="text"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="newTopicDesc" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <input
                  id="newTopicDesc"
                  type="text"
                  value={newTopicDescription}
                  onChange={(e) => setNewTopicDescription(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="newTopicParent" className="block text-sm font-medium text-gray-700">
                  Parent Topic (optional)
                </label>
                <select
                  id="newTopicParent"
                  value={newTopicParentId}
                  onChange={(e) => setNewTopicParentId(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">None</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateTopic}
                  disabled={topicSaving || !newTopicName.trim() || !newTopicDescription.trim()}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {topicSaving ? "Creating..." : "Create Topic"}
                </button>
                <button
                  onClick={() => {
                    setCreatingTopic(false);
                    setNewTopicName("");
                    setNewTopicDescription("");
                    setNewTopicParentId("");
                  }}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Lesson title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Lesson Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Introduction to Nuclear Fission"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Description (optional) */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Focus on safety protocols that emerged after Chernobyl and Fukushima"
              rows={2}
              className="mt-1 block w-full resize-none rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Education level */}
          <div>
            <label htmlFor="level" className="block text-sm font-medium text-gray-700">
              Education Level
            </label>
            <select
              id="level"
              value={educationLevel}
              onChange={(e) => setEducationLevel(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select level...</option>
              <option value="high_school">High School</option>
              <option value="college">College</option>
              <option value="graduate">Graduate</option>
            </select>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={!formValid}
            className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Generate Lesson
          </button>
        </div>
      )}

      {viewState === "loading" && (
        <div className="mt-12 flex flex-col items-center gap-4 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-lg font-medium text-gray-700">
            Agent is generating your lesson...
          </p>
          <p className="text-sm text-gray-500">
            This can take 30-60 seconds. Please do not close this page.
          </p>
        </div>
      )}

      {viewState === "success" && result && (
        <div className="mt-8 space-y-6">
          <div className="rounded-md border border-green-200 bg-green-50 p-4">
            <h2 className="text-lg font-semibold text-green-800">
              Lesson Created Successfully
            </h2>
            <p className="mt-2 text-sm text-green-700">
              &ldquo;{title}&rdquo; has been generated and saved.
            </p>
          </div>

          {result.steps.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700">Steps taken</h3>
              <ul className="mt-2 space-y-1">
                {result.steps.map((step, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-sm text-gray-600"
                  >
                    <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                    {step.tool}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.lessonId && (
            <Link
              href={`/lessons/${result.lessonId}`}
              className="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              View Lesson
            </Link>
          )}

          <button
            onClick={handleReset}
            className="block rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Generate Another
          </button>
        </div>
      )}

      {viewState === "error" && (
        <div className="mt-8 space-y-6">
          <div className="rounded-md border border-red-200 bg-red-50 p-4">
            <h2 className="text-lg font-semibold text-red-800">Error</h2>
            <p className="mt-2 text-sm text-red-700">{errorMessage}</p>
          </div>

          {result && result.steps.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700">Steps completed before failure</h3>
              <ul className="mt-2 space-y-1">
                {result.steps.map((step, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-sm text-gray-600"
                  >
                    <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
                    {step.tool}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={() => setViewState("form")}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      )}
    </main>
  );
}
