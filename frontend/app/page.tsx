"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Github, Rocket } from "lucide-react";
import { Fira_Code } from "next/font/google";
import axios from "axios";

const socket = io(process.env.SOCKET_SERVER_ORIGIN);
const firaCode = Fira_Code({ subsets: ["latin"] });

export default function Home() {
  const [repoURL, setURL] = useState<string>("");
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState<string | undefined>();
  const [deployPreviewURL, setDeployPreviewURL] = useState<
    string | undefined
  >();

  const logContainerRef = useRef<HTMLElement>(null);

  const isValidURL: [boolean, string | null] = useMemo(() => {
    if (!repoURL || repoURL.trim() === "") return [false, null];
    const regex = new RegExp(
      /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)(?:\/)?$/
    );
    return [regex.test(repoURL), "Enter valid Github Repository URL"];
  }, [repoURL]);

  const handleClickDeploy = useCallback(async () => {
    setLoading(true);
    setLogs([]);

    try {
      const { data } = await axios.post(
        `${process.env.API_SERVER_ORIGIN}/project`,
        {
          gitURL: repoURL,
        }
      );

      console.log(data);

      if (data?.data) {
        const { projectSlug, url } = data.data;
        setProjectId(projectSlug);
        setDeployPreviewURL(url);

        console.log(`Subscribing to logs:${projectSlug}`);
        socket.emit("subscribe", `logs:${projectSlug}`);
      }
    } catch (error) {
      console.error("Deployment error:", error);
      setLogs((prev) => [...prev, "Deployment failed. Please try again."]);
    }
  }, [projectId, repoURL]);

  const handleSocketIncommingMessage = useCallback((message: string) => {
    console.log(`[Incoming Socket Message]:`, typeof message, message);
    try {
      const { log } = JSON.parse(message);
      setLogs((prev) => [...prev, log]);
      if (log === "Done") setLoading(false);
    } catch (error) {
      console.warn("Received non-JSON message:", message);
      setLogs((prev) => [...prev, message]);
    }
    logContainerRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    socket.on("message", handleSocketIncommingMessage);

    return () => {
      socket.off("message", handleSocketIncommingMessage);
    };
  }, [handleSocketIncommingMessage]);
  return (
    <main className="flex justify-center items-center h-screen bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 p-4">
      <div className="max-w-xl w-full bg-white p-10 rounded-lg shadow-xl">
        <div className="flex items-center justify-center gap-1 mb-7">
          <h1 className="text-5xl font-extrabold text-gray-800 flex">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Swift Deploy
            </span>
          </h1>
          <Rocket className="text-6xl text-purple-600" />
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4 mb-4">
            <Github className="text-6xl text-gray-700" />
            <Input
              disabled={loading}
              value={repoURL}
              onChange={(e) => setURL(e.target.value)}
              type="url"
              placeholder="Enter Github Repository URL"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <Button
            onClick={handleClickDeploy}
            disabled={!isValidURL[0] || loading}
            className="w-full py-3 bg-blue-600 text-white font-bold text-lg rounded-lg hover:bg-blue-700 transition-colors"
          >
            {loading ? "Deployment in Progress..." : "DEPLOY NOW"}
          </Button>
          {deployPreviewURL && !loading && (
            <div className=" bg-gray-800 text-white py-3 px-2 rounded-lg text-center">
              <p className="mt-2">
                Preview URL:{" "}
                <a
                  target="_blank"
                  className="text-sky-400 underline"
                  href={deployPreviewURL}
                >
                  {deployPreviewURL}
                </a>
              </p>
            </div>
          )}
          {logs.length > 0 && (
            <div
              className={`${firaCode.className} text-sm logs-container mt-5 border-green-500 border-2 rounded-lg p-4 h-[300px] overflow-y-auto bg-gray-900 text-white`}
            >
              <pre className="flex flex-col gap-1">
                {logs.map((log, i) => (
                  <code
                    ref={logs.length - 1 === i ? logContainerRef : undefined}
                    key={i}
                  >{`> ${log}`}</code>
                ))}
              </pre>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
